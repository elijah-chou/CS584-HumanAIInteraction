import replicate
import random
import logging
import os

# Configuration
# DO NOT CHANGE THESE PARAMETERS
MODEL_NAME = "mistralai/mistral-7b-v0.1:3e8a0fb6d7812ce30701ba597e5080689bef8a013e5c6a724fafb108cc2426a0"
MAX_NEW_TOKENS = 128

# YOU CAN CHANGE THESE PARAMETERS
NUM_CONVERSATIONS = 50
QUALITY_THRESHOLD = 4

# Initialize logging
logging.basicConfig(level=logging.INFO)

# Cache structure: {"conversation": String, "quality": Integer}
conversation_quality_cache = {}
conversations = []


def run_mistral(prompt, max_new_tokens=MAX_NEW_TOKENS):
    try:
        output = replicate.run(
            MODEL_NAME,
            input={"prompt": prompt, "max_new_tokens": max_new_tokens},
        )
        final = "ASSISTANT: "
        # HINT: See if you want to change this to keep only the first output. What are the benefits / drawbacks?
        for item in output:
            final = final + item
        return final
    except Exception as e:
        logging.error(f"API call failed with error: {e}")
        return ""


def check_conversation_quality(conversation):
    # Get quality from cache or set default to None
    quality = conversation_quality_cache.get(conversation, {}).get("quality")

    if quality is None:
        # write a detailed prompt to get a rating for the conversation
        quality_prompt = f"Please rate the following conversation on a scale of 1 to 5. \
                        Do not output anything other than a number between 1 and 5. \
                        You must only output a digit, which will always be between 1 and 5. \
                        This number will represent the quality of the conversation based on:\
                        \\nRelevance: Does the conversation stay on topic and avoid irrelevant or off-topic remarks? \
                        \\nContent: Is the conversation informative, engaging, and thought-provoking? \
                        \\nClarity: Are the messages clear, concise, and easy to understand? \
                        \\nGrammar and Style: Is the language used correctly and appropriately? \
                        \\nEngagement: Does the conversation encourage participation and interaction between the participants? \
                        \\n\\n{conversation}\\n\\nRating:"
        rating = run_mistral(quality_prompt)

        try:
            print(rating)
            quality = int(
                next(filter(str.isdigit, rating), "0")
            )  # Pick the first digit
            assert quality >= 1 and quality <= 5
        except Exception as e:
            print("Error: ", e)
            quality = 3
        conversation_quality_cache[conversation] = {"quality": quality}

    return quality


def generate_conversation():
    """
    The goal of this function is to generate a different conversation each time.
    TODO: In this function edit the code to make sure that the conversation block as at most 6 assistant messages.
    TODO: If it has more than 6 blocks, only use the first 6.
    """
    system_message = "<SYS> You are an AI assistant that can generate synthetic conversations between a human user \
        and an AI assistant. You are helpful, polite, honest, sophisticated, emotionally aware, and \
        humble-but-knowledgeable. You respond empathetically to the user with open, conversational follow-up questions. The human \
        is intellectually curious and asks you thoughtful, thorough follow-up questions. </SYS>"
    user_messages = [
        "I'm curious about the origins of language. Can you share some insights on how language evolved over time?",
        "I'm fascinated by the world of dreams. Can you explain the different types of dreams and their possible interpretations?",
        "What do you think about the latest iPhone?",
        "What is your favorite programming language?",
        "What is your favorite movie?",
        "I'm interested in learning more about the cosmos. Can you describe the various planets and celestial objects in our solar system?",
        "I'm intrigued by the human brain and its incredible capabilities. Can you explain how the brain processes information and generates thoughts?",
        "I'm passionate about music and its ability to evoke emotions. Can you discuss the history of music and the different genres that have emerged over time?",
        "I'm interested in understanding different cultures and their unique traditions. Can you share some insights into the customs and beliefs of various cultures around the world?",
        "What are the latest developments in AI? How is AI being used in different industries?",
        "Can you explain the theory of relativity and its implications for our understanding of the universe?",
        "Can you discuss the ethical considerations and potential applications of AI?",
        "What is your favorite book? Can you explain the plot and themes of the book?",
        "If you could have any superpower, what would it be?",
        "Would you rather be able to fly or be invisible?",
        "What would you do if you won the lottery?",
        "If you could travel anywhere in the world, where would you go?",
        "In your opinion, what is the meaning of life?",
        "Can you help me with my homework? What is the answer to this question? 2 + 2 = ?",
        "Describe your ideal vacation.",
        "Give me ideas for a fun date.",
        "Translate this English text to Hindi.",
        "What is the weather like today?",
        "Explain the plot of the movie Tenet.",
        "How can I improve my coding skills?",
        "What is the best way to learn a new language?",
        "How many languages does an average person speak?",
        "How can I get admitted to Emory University?",
        "What is the best way to prepare for a job interview?",
        "Suggest a diet plan for me.",
        "How to get started with Gym?",
        "What is the best way to learn how to swim?",
        "How to lose weight?",
        # "I want to have a short, iteractive conversation with you. We can talk about anything, including hobbies, coding, technology, etc.""
    ]
    user_message = random.choice(user_messages)
    prompt = f"{system_message}\nUSER: {user_message}\nASSISTANT:"
    conversation = run_mistral(prompt)
    # Remove extra spaces and truncate conversation to last punctuation mark
    conversation = truncate_conversation(remove_extra_spaces(conversation))
    print(conversation)
    # Store in cache (with quality uninitialized)
    conversation_quality_cache[conversation] = {}
    # print(conversation_quality_cache)
    return conversation


# Helper function to remove extra spaces
def remove_extra_spaces(conversation):
    while "  " in conversation:
        conversation = conversation.replace("  ", " ")
    return conversation


# Helper function to truncate conversation to last punctuation mark
def truncate_conversation(conversation):
    punctuation = [".", "!", "?"]
    for i in range(len(conversation) - 1, -1, -1):
        if conversation[i] in punctuation:
            return conversation[: i + 1]
    return conversation


def main():
    logging.info("Generating conversations...")
    # Export Replicate API Token as an environment variable
    os.environ[
        "REPLICATE_API_TOKEN"
    ] = "<REPLACE WITH REPLICATE TOKEN"

    # conversations is a global variable
    conversations = [generate_conversation() for _ in range(NUM_CONVERSATIONS)]

    # HINT: You should save the generated conversations to a file, so you can then inspect them, filter them etc.

    logging.info("Filtering by quality...")
    high_quality_conversations = []
    low_quality_conversations = []
    for conv in conversations:
        quality = check_conversation_quality(conv)
        if quality >= QUALITY_THRESHOLD:
            high_quality_conversations.append(conv)
        else:
            low_quality_conversations.append(conv)

    # HINT: You should save the quality dict (`conversation_quality_cache`) and see if the ratings are what you want.
    with open("synthetic_dataset_7.txt", "w") as f:
        for conv in high_quality_conversations:
            try:
                conversation_formatted = conv.replace(
                    "\n", "\\n"
                )  # escape newlines, so you can keep your result on one line in the output
                f.write(conversation_formatted + "\n")
            except:
                print("Error")

    with open("low_quality_conversations_7.txt", "w") as f:
        for conv in low_quality_conversations:
            try:
                conversation_formatted = conv.replace("\n", "\\n")
                f.write(conversation_formatted + "\n")
            except:
                print("Error")

    logging.info(
        f"Saved {len(high_quality_conversations)} high-quality conversations."
    )


if __name__ == "__main__":
    main()
