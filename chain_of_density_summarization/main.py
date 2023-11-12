import numpy as np
import openai


class LLMAgent(object):

    def __init__(self):
        self.llm = None
        self.key = None
        self.model = None

    def create_llama_agent(self):
        self.llm = "llama"

    # the object variables used here will be used as arguments later for authenticating my OpenAI API calls
    def create_openai_agent(self):
        self.llm = "openai"
        self.key = "<REPLACE WITH OPENAI API KEY>"
        self.model = "gpt-3.5-turbo"
        self.org_id = "<REPLACE WITH OPENAI ORGANIZATION ID>"

def call_LLM_model(msgs):
    """My own helper function that can be called with an input of "msgs", which should include the prompts needed for the specific call.
    
    Note that I chose to use the OpenAI model for this assignment, so I did not implement the llama model call.

    """
    agent = LLMAgent()
    agent.create_openai_agent()
    openai.organization = agent.org_id
    openai.api_key = agent.key
    response = openai.ChatCompletion.create(
        model=agent.model,
        messages = msgs, # list of dicts containing system and user prompts defined by different function use cases respectively
        temperature = 0 # set to 0 for reproducibility
    )
    return response

def base_summary(text):
    """Generate an initial entity-sparse summary of the given text.

    Args:
    - text (str): The input text to be summarized.

    Returns:
    - str: An entity-sparse summary.
    """
    user_message = f"Summarize the following text: {text}" # simply ask the model to generate an entity-sparse summary for a given text
    messages = [
        {"role": "system", "content": "You are a helpful assistant that generates entity-sparse summaries after being given a text."},
        {"role": "user", "content": user_message}
    ] # Note: all functions will order system/user messages similarly to above
    response = call_LLM_model(messages)
    summary = response['choices'][0]['message']['content'].strip() # finds the model generated response string and strips leading and trailing whitespaces
    return summary


def extract_entities(text):
    """Extract and rank entities from the given text.

    Args:
    - text (str): The input text from which entities should be extracted.

    Returns:
    - list: A list of extracted entities ranked by importance.
    """
    user_message = f"Extract and rank entities from the given text. To be more specific, entities can be individual names, companies, agencies, institutions, cities, countries, rivers, mountains, specific dates, months, years, specific times of the day, percent values, financial amounts, including currencies, measurements, ordinal and cardinal values, specific notable events, products, titles of books, songs, movies, designations for specific laws or legal document names, buildings, airports, highways, bridges, names of languages, nationalities, religions, Americans, Buddhists, Democrats, etc. Given Text: {text}"
    messages = [
        {"role": "system", "content": "You are a helpful assistant that extracts and ranks entities from the given text. You should giving your response in a Python list format, where entities in the list are ordered by their rankings."},
        {"role": "user", "content": user_message}
    ]
    response = call_LLM_model(messages)
    # Even though I have asked the model to return a Python list, I will still receive it as a string, so the below code
    # takes the string, removes the heading and trailing square brackets, removes the single apostrophes, and uses
    # the split function to separate the string into a list of strings.
    entities = response['choices'][0]['message']['content'].strip('][').replace("'", "").split(", ")
    return entities

def increase_density(summary, entities, target_length):
    """Iteratively incorporate missing entities into the summary without
    increasing its length, using abstraction, fusion, and compression techniques.

    Args:
    - summary (str): The initial summary.
    - entities (list): List of entities to be incorporated into the summary.
    - target_length (int): The desired length of the final summary.

    Returns:
    - str: The final summary with increased density.
    """
    user_message = f"Utilizing abstraction, fusion, and compression techniques, rewrite the given summary to incorporate any entities found in the provided Python list that are missing from the summary. Make sure that the summary you write is at most {target_length} characters long, which is the length of the original summary. Also make sure that any entities that are already present do not disappear in your new summary. Entity list: {entities}. Summary: {summary}."
    messages = [
        {"role": "system", "content": "You are a helpful assistant that is an expert on using abstraction, fusion, and compression techniques to increase entity densities of summaries given to you."},
        {"role": "user", "content": user_message}
    ]
    response = call_LLM_model(messages)
    dense_summary = response['choices'][0]['message']['content'].strip()
    return dense_summary  

def dense_summary(text):
    """Produces a dense summary in a single step without iteration.
    """
    # Prompt that specifies what entities are and asks model to write an entity-dense summary
    user_message = f"Write an entity-dense summary from the given text. Ensure to include as many entities from the original text in your summary. To be more specific, entities can be individual names, companies, agencies, institutions, cities, countries, rivers, mountains, specific dates, months, years, specific times of the day, percent values, financial amounts, including currencies, measurements, ordinal and cardinal values, specific notable events, products, titles of books, songs, movies, designations for specific laws or legal document names, buildings, airports, highways, bridges, names of languages, nationalities, religions, Americans, Buddhists, Democrats, etc. Text to summarize: {text} "
    
    # Prompt that asks the model to 1) identify entities (without specifying what entities are) and then 2) write a summary that incorporates those entities
    # user_message = f"First determine what entities are included in the given text. Then, utilizing abstraction, fusion, and compression techniques, write a entity-dense summary that includes most, if not all, of the entities you found earlier. Only return the summary to me. Text to summarize: {text}"
    
    messages = [
        {"role": "system", "content": "You are a helpful assistant that can extract entities from any given text. You are also an expert on using abstraction, fusion, and compression techniques to write entity-dense summaries from the same provided text."},
        {"role": "user", "content": user_message}
    ]
    response = call_LLM_model(messages)
    one_step_summary = response['choices'][0]['message']['content'].strip()
    return one_step_summary


def evaluate_summaries(summaries):
    """Compare the given summaries and possibly human-written summaries.

    Args:
    - summaries (dict): A dictionary of dictionaries, each containing a "text" and "summary" key. The "text" value contains the original text
                        to get the list of entities. The "summary" value contains the summary.

    Returns:
    - dict: A dictionary containing evaluation metrics for each summary.

    ********IMPORTANT*********
    Alternative evalution method: One alternative method of evaluating these summaries is by measuring the "n-gram" overlap between summaries
    and their source text. The reason why this might be a more effective manner of evaluating summaries is because it examines the relationships
    between words and determines how much of the existing relationships in the original text are carried over into the corresponding summaries.
    The idea is that by doing this, we can also indirectly examine how much context surrounding the entities are carried over into the summaries,
    which might be more important than simply having the same keywords from the text in the summaries. One caveat of the current evaluation method
    is that even if the entities in the original text are present in the summary, the information about those entities may not necessarily make it
    into the summary. The hope with this alternative method is that by evaluating overlap of combinations of words between the source text and 
    summary, we can better measure how much context is carried over to the summary, even if it's only a little better than the current method.

    The way to automate this evaluation would be to first compute a list of n-grams of words for both the summaries and their source texts, then
    calculate how many n-grams from the summary can be found in the list of n-grams for the source text. Computing a list of n-grams could look 
    something like splitting each text/summary into a list of strings with split(), and then creating a new list of strings, where each string is a
    combination of all words between the ith word and the (i+n)th word in the text/summary list. Keep adding words until you reach the final 
    combination possible in each text/summary. A simple score to calculate would be to divide the total number of matching n-grams by the total number 
    of n-grams in the source text (which presumably has more n-grams than the summary).

    """
    results = {}
    for key in summaries.keys():
        summary = summaries[key]['summary']
        text_entities = extract_entities(summaries[key]['text']) # calls extract_entities to get list of entities present in original text
        total_entities = len(text_entities) # count total number of entities extracted
        count_entities = 0

        # increments count of entities found in summary if entity is present
        for i in range(total_entities):
            if text_entities[i] in summary:
                count_entities += 1
        
        # for each summary, returns 1) total number of entities extracted from original text, 2) number of extracted entities found in summary, and 3) score calculated by dividing 2 by 1.
        result = {'Entities in Text': total_entities, 'Matching Entities in Summary': count_entities, 'Score': count_entities/total_entities}
        results[key] = result
    return results


# End-to-end testing and evaluation
if __name__ == "__main__":
    # Article to Summarize
    text = "With house prices soaring, it's not easy finding somewhere to live. And this community has thrown in the towel. Meet Seattle's rolling neighborhood of RVs, where each unassuming vehicle is a capsule home. The unusual format has been captured in a series of photographs by visual journalist Anna Erickson. Meet Bud Dodson, 57, and welcome to his home: An RV in Seattle's SoDo where he watches over the parking lot in exchange for a spot . No place like home: John Warden, 52, has turned his $200 vehicle into his home after his apartment burned down years ago . There are around 30 drivers that float in and out of this parking lot in the SoDo (South of Downtown) area of the city in Washington State. One might not notice them in the mornings as hundreds of workers in the nearby factories, such as Starbucks, park up and rush into work. But on the weekends, as the rabble flocks back to their beds, this unique group remains. John Worden, 52, has been living in his vehicle for years since his apartment burned down and he was left homeless. He told Anna his car cost $200, and doesn't drive very well. But for a home, it's just about enough. Though plan on the outside, it is a Pandora's Box inside, Anna tells DailyMail.com. 'It was scattered with trinkets that he had been collecting over the years,' she explained, 'and a pile of beer cans that he was saving to turn in for money.' For work, he panhandles while helping people find parking spaces at Safeco Field stadium, where he used to be a cook. People come and go for work in the factories nearby, but on the weekend it is just the RV-dwellers that area left . Daily life: Here Bud can be seen preparing himself a barbecue on the gravel outside his capsule home, one of about 30 in the community . Eclectic: While Bud's RV is organized and functional, John's is full of trinkets and belongings dating back years . Alongside him - most of the time - is Bud Dodson, 57. While some are forced to move about regularly, Dodson, a maintenance man, looks after the parking lot in exchange for a semi-permanent spot. His home has its own unique stamp on it. 'He had really made the RV his home and taken good care of it,' Anna described. 'It was more functional [than John's] and a cleaner space with a bed, kitchen and bathroom.' Whether organized or eclectic, however, each one is home. 'None of them seem to want to move on,' Anna said. 'It's not perfect but they seem pretty content. Move in, move out: Some have agreements to stay, but others have to keep driving around to find a spot . John works as a panhandler at Safeco Fields stadium, where he used to work as a cook . He is content with his life in between the usual confines of society . Personal: To many this may just seem like a parking lot but for these men it is a very personal space . 'Bud is very grateful, he said the parking lot owner is just such a nice guy to let him live like this.' She came across them when she stopped to ask a seemingly homeless man for directions. 'We got talking,' she said, 'and he mentioned that he lived nearby in an RV. I went round to look and there was a whole bunch of them.' Curious, she spent about two months returning to the spot, meeting with the community and building their trust. 'These RVs are their homes so it's a very personal thing,' she explained."
    
    # Step 1: Generate entity-sparse summary with base_summary()
    initial_summary = base_summary(text)
    
    # Step 2: Extract entities from the original text with extract_entities()
    entities = extract_entities(text)

    # Step 3: Call increase_density 3 times, using the returned summary in the next call
    first_iter = increase_density(initial_summary, entities, len(initial_summary))
    second_iter = increase_density(first_iter, entities, len(first_iter))
    final_summary = increase_density(second_iter, entities, len(second_iter))

    # Step 3.5: Generate entity-dense summary with one step function (for extra credit)
    one_step_summary = dense_summary(text)

    # Step 4: Put each summary into dictionaries with original text
    init_sum = {'text': text, 'summary': initial_summary}
    first_sum = {'text': text, 'summary': first_iter}
    second_sum = {'text': text, 'summary': second_iter}
    final_sum = {'text': text, 'summary': final_summary}
    one_step_sum = {'text': text, 'summary': one_step_summary}

    # Step 5: Print final and one-step summaries out to compare qualitatively
    print("Final Summary:")
    print(final_summary)
    print("One-Step Summary:")
    print(one_step_summary)

    # Step 6: Aggregate all dictionaries into one dictionary and pass that into evalute_summaries for summarization evaluation
    summaries = {"initial": init_sum, "first": first_sum, "second": second_sum, "final": final_sum, "one step": one_step_sum}
    results = evaluate_summaries(summaries)
    print(results)
