// PRIMARY FILE FOR GOOGLE PaLM API INTEGRATION
// This file contains the code for the Google PaLM API integration.

// Main helper function that standardizes the model parameters other
// than the prompt and sends the request to the Google PaLM API
async function sendToGooglePaLM(prompt) {
	const response = await fetch( // sends the request to the Google PaLM API along with our API key
		"https://generativelanguage.googleapis.com/v1beta3/models/chat-bison-001:generateMessage?key=<REPLACE WITH YOUR OWN KEY>",
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				model: "models/text-bison-001", // model name
				prompt: { messages: [{ content: prompt }] },
				temperature: 0.1, // set to 0.1 for minimal randomness and controlled testing
				candidateCount: 1, // tells model to only return one response
			}),
		}
	);
	const data = await response.json();
	return data.candidates[0].content; // returns the "first candidate" response from the model
}

// Helper function to remove the original input text from the received response.
// This is necessary because the model sometimes repeats the input text in the response.
function removeOriginalText(userInput, response) {
	userInput = "\n" + userInput + "\n";
	var newText = response.replace(userInput, "");
	return newText;
}

// Helper function to parse the response from the Devil's Advocate Daemon.
// We created this because the response from the Devil's Advocate Daemon was not
// consistent and often contained unescaped double quotes, which caused the JSON
// parsing to fail. This function manually handles such cases
function customParser(jsonText) {
	// Replace single quotes inside double quotes to preserve them
	const modifiedJsonText = jsonText.replace(
		/'(?=(?:[^"]*"[^"]*")*[^"]*$)/g,
		'"'
	);

	// Here we parse the modified JSON script
	let parsedJson;
	try {
		parsedJson = JSON.parse(modifiedJsonText);
	} catch (error) {
		// manually extract the sentence and challenge if the JSON parsing fails
		var sentence = modifiedJsonText.substring( // looks for the sentence and challenge in the modified JSON script
			modifiedJsonText.indexOf('"sentence": "') + 13,
			modifiedJsonText.indexOf('",\n  "challenge": "')
		);
		var challenge = modifiedJsonText.substring(
			modifiedJsonText.indexOf('"challenge": "') + 14,
			modifiedJsonText.indexOf('"\n}')
		);
		parsedJson = { sentence: sentence, challenge: challenge };
		console.log(parsedJson);
	}
	return parsedJson;
}

// Helpful Assistant Daemon
// This click listener is triggered when the user clicks on the Helpful Assistant Daemon.
document
	.querySelector("#helpful-assistant")
	.addEventListener("click", async function () {
		// if feedback box, challenge box, or replacement box is already open, remove it
		if (document.getElementById("feedback-box")) {
			document.getElementById("feedback-box").remove();
		}
		if (document.getElementById("challenge-box")) {
			document.getElementById("challenge-box").remove();
		}
		if (document.getElementById("replacement-box")) {
			document.getElementById("replacement-box").remove();
		}
		// disable the other daemons while the helpful assistant is running
		// and show a loading icon
		document.getElementById("helpful-assistant").innerHTML = `
			<div class="loader"></div>
		`;
		document.getElementById("devils-advocate").disabled = true;
		document.getElementById("creative-mastermind").disabled = true;

		// range here means the selected text
		let range = quill.getSelection(true);
		if (range.length == 0) {
			// defaults to select the whole text if no text is selected
			range = quill.getSelection();
			range.index = 0;
			range.length = quill.getLength();
		}

		// saves the selected text as a string
		var text = quill.getText(range.index, range.length);

		// get the helpful assistant tuning parameters
		var lengthOfFeedback = document.getElementById(
			"helpful-assistant-input-1"
		).value;
		var approach = document.getElementById(
			"helpful-assistant-input-2"
		).value;
		var formality = document.getElementById(
			"helpful-assistant-input-3"
		).value;

		let response = await sendToGooglePaLM(
			// sends helpful assistant prompt with tuning parameters to Google PaLM API
			"You are a helpful assistant that likes to give constructive feedback in numbered lists. Please respond with " +
				lengthOfFeedback +
				" about how the user could improve their writing. Please DO NOT repeat the user's text \
			when giving your response. You should " +
				approach +
				" when examining the user's writing and giving feedback. You should also give feedback to help the user write in a " +
				formality +
				" tone. The following is the user's writing: " +
				text +
				"\n\nYour feedback on the user's writing:\n\n"
		);

		// try catch block to catch the error if the model somehow fails
		try {
			console.log(response);
			response = removeOriginalText(text, response); // removes the original text from the response since it sometimes repeats it
			var firstColon = response.indexOf(":\n\n");
			if (firstColon != -1) {
				// if model responds with something before numbered list, remove it
				response = response.substring(firstColon + 3, response.length);
			}
			console.log(response);
		} catch (error) {
			// catch error if model somehow fails
			console.log(error);
			alert("Oops! Something went wrong. Please try again.");
			// restore the daemons to their original state
			document.getElementById("helpful-assistant").innerHTML = `
				<b>Helpful Assistant</b>
				<span class="tooltips" id="hover-text-helpful-assistant">
				I will help you improve your writing by giving you general tips on what could be changed.
				</span>
			`;
			// re-enable the other daemons
			document.getElementById("devils-advocate").disabled = false;
			document.getElementById("creative-mastermind").disabled = false;
			return;
		}

		// create a box above the editor to display the feedback
		var feedbackBox = document.createElement("div");
		feedbackBox.setAttribute("id", "feedback-box");
		feedbackBox.setAttribute(
			"style",
			"width: fit-content; margin: 10px 0px;"
		);
		feedbackBox.innerHTML = `
		<div style="display: flex; flex-direction: column; align-items: center;">
			<b>Helpful Assistant's Feedback:</b>
			<textarea id="feedback-textarea" rows="7" cols="100" style="margin-top: 10px;"></textarea>
			<div style="display: flex; justify-content: flex-end; width: 100%;">
				<button id="helpful-assistant-dismiss-button" style="margin-top: 10px;">Dismiss</button>
			</div>
		</div>
		`;
		// add the feedback box to the page
		document.getElementById("fine-tune-daemons").appendChild(feedbackBox);
		document.getElementById("feedback-textarea").value = response; // set the value of the feedback box to the response
		document.getElementById("feedback-textarea").focus();
		// add event listener to the dismiss button to remove the feedback box when clicked
		document
			.getElementById("helpful-assistant-dismiss-button")
			.addEventListener("click", function () {
				document.getElementById("feedback-box").remove();
				document.getElementById("devils-advocate").disabled = false;
				document.getElementById("creative-mastermind").disabled = false;
			});
		document.getElementById("devils-advocate").disabled = false;
		document.getElementById("creative-mastermind").disabled = false;
		document.getElementById(
			"helpful-assistant"
		).innerHTML = `<b>Helpful Assistant</b>
			<span class="tooltips" id="hover-text-helpful-assistant">
			I will help you improve your writing by giving you general tips on what could be changed.
		</span>`;
	});

// Devil's Advocate Daemon
// This click listener is triggered when the user clicks on the Devil's Advocate Daemon.
document
	.querySelector("#devils-advocate")
	.addEventListener("click", async function () {
		// if feedback box, challenge box, or replacement box is already open, remove it
		if (document.getElementById("feedback-box")) {
			document.getElementById("feedback-box").remove();
		}
		if (document.getElementById("challenge-box")) {
			document.getElementById("challenge-box").remove();
		}
		if (document.getElementById("replacement-box")) {
			document.getElementById("replacement-box").remove();
		}
		// disable the other daemons while the devil's advocate is running
		// and show a loading icon
		document.getElementById("devils-advocate").innerHTML = `
			<div class="loader"></div>
		`;
		document.getElementById("helpful-assistant").disabled = true;
		document.getElementById("creative-mastermind").disabled = true;

		// saves the selected text as a string
		let range = quill.getSelection(true);
		if (range.length == 0) {
			// defaults to select the whole text if no text is selected
			range = quill.getSelection();
			range.index = 0;
			range.length = quill.getLength();
		}

		// get the devil's advocate tuning parameters
		var text = quill.getText(range.index, range.length);
		var depth = document.getElementById("devils-advocate-input-1").value;
		var focus = document.getElementById("devils-advocate-input-2").value;
		var tone = document.getElementById("devils-advocate-input-3").value;
		let response = await sendToGooglePaLM(
			// send devil's advocate prompt with tuning parameters to Google PaLM API
			"Please read the following text and find faults in it: \n\n" +
				text +
				'\n\nProvide your output in the following JSON format. \
				Include all of your criticisms in a single JSON. Replace the values of the key according to the sentence \
				in which you are finding the faults, and what your challenge is to that sentence:\n \
			{\n \
				"sentence": "The sentence that you want to challenge. This sentence (((MUST))) be in the text provided above.",\n \
				"challenge": "Your challenge to the sentence"\n \
				}\n \
				Your depth of analysis should be ' +
				depth +
				". Your challenge should address the " +
				focus +
				" when you provide the criticism. You should respond in a " +
				tone +
				" while writing. Please respond in a JSON format. Your response should (((NOT))) include any double quotes for the values"
		);
		console.log(response);
		// try catch block to catch the error if the model somehow fails
		try {
			// parse the response with the custom parser defined above
			response = response.substring(response.indexOf("{"));
			response = response.substring(0, response.indexOf("}") + 1);
			response = customParser(response);
		} catch (error) {
			console.log(error);
			alert("Oops! Something went wrong. Please try again.");
			// restore the daemons to their original state
			document.getElementById("devils-advocate").innerHTML = `
				<b>Devil's Advocate</b>
				<span class="tooltips" id="hover-text-devils-advocate">
					I will find the weaknesses in your writing and give you suggestions on how to improve it.
				</span>
			`;
			document.getElementById("helpful-assistant").disabled = false;
			document.getElementById("creative-mastermind").disabled = false;
			return;
		}
		// search for the sentence in the original text and highlight it in red and use bold font
		var index = text.indexOf(response.sentence);
		quill.setSelection(index, response.sentence.length);
		quill.format("background", "red");
		quill.format("color", "white");
		quill.format("bold", true);
		document.getElementById(
			"devils-advocate"
		).innerHTML = `<b>Devil's Advocate</b>
			<span class="tooltips" id="hover-text-devils-advocate">
				I will find the weaknesses in your writing and give you suggestions on how to improve it.
			</span>`;
		// create a box to enter the challenge returned by model
		var challengeBox = document.createElement("div");
		challengeBox.setAttribute("id", "challenge-box");
		challengeBox.setAttribute(
			"style",
			"width: fit-content; margin: 10px 0px;"
		);
		challengeBox.innerHTML = `
		<div style="display: flex; flex-direction: column; align-items: center;">
			<b>Devil's Advocate's Challenge:</b>
			<textarea id="challenge-textarea" rows="7" cols="100" style="margin-top: 10px;"></textarea>
			<div style="display: flex; justify-content: flex-end; width: 100%;">
				<button id="devils-advocate-dismiss-button" style="margin-top: 10px;">Dismiss</button>
			</div>
		</div>
		`;
		// add the challenge box to the page
		document.getElementById("fine-tune-daemons").appendChild(challengeBox);
		document.getElementById("challenge-textarea").value =
			response.challenge;
		document.getElementById("challenge-textarea").focus();
		// add event listener to the dismiss button to remove the challenge box when clicked
		document
			.getElementById("devils-advocate-dismiss-button")
			.addEventListener("click", function () {
				document.getElementById("challenge-box").remove();
				quill.setSelection(0, quill.getLength());
				quill.format("background", "white");
				quill.format("color", "black");
				quill.format("bold", false);
				// restore the daemons to their original state
				document.getElementById("devils-advocate").innerHTML = `
					<b>Devil's Advocate</b>
					<span class="tooltips" id="hover-text-devils-advocate">
						I will find the weaknesses in your writing and give you suggestions on how to improve it.
					</span>
				`;
				document.getElementById("helpful-assistant").disabled = false;
				document.getElementById("creative-mastermind").disabled = false;
			});
		document.getElementById("helpful-assistant").disabled = false;
		document.getElementById("creative-mastermind").disabled = false;
	});

// Creative Mastermind Daemon
// This click listener is triggered when the user clicks on the Creative Mastermind Daemon.
document
	.querySelector("#creative-mastermind")
	.addEventListener("click", async function () {
		// if feedback box, challenge box, or replacement box is already open, remove it
		if (document.getElementById("feedback-box")) {
			document.getElementById("feedback-box").remove();
		}
		if (document.getElementById("challenge-box")) {
			document.getElementById("challenge-box").remove();
		}
		if (document.getElementById("replacement-box")) {
			document.getElementById("replacement-box").remove();
		}
		// disable the other daemons while the creative mastermind is running
		// and show a loading icon
		document.getElementById("creative-mastermind").innerHTML = `
			<div class="loader"></div>
		`;
		document.getElementById("helpful-assistant").disabled = true;
		document.getElementById("devils-advocate").disabled = true;

		let range = quill.getSelection(true);
		if (range.length == 0) {
			// defaults to select the whole text if no text is selected
			range = quill.getSelection();
			range.index = 0;
			range.length = quill.getLength();
		}

		// saves the selected text as a string
		var text = quill.getText(range.index, range.length);

		// get the creative mastermind tuning parameters
		var humor = document.getElementById(
			"creative-mastermind-input-1"
		).value;
		var figurativeLanguage = document.getElementById(
			"creative-mastermind-input-2"
		).value;
		var vocabulary = document.getElementById(
			"creative-mastermind-input-3"
		).value;

		let response = await sendToGooglePaLM(
			// sends creative mastermind prompt with tuning parameters to Google PaLM API
			"You are a creative mastermind who can make text more creative and add flair to it.\
			Your response should have " +
				humor +
				", " +
				figurativeLanguage +
				", and " +
				vocabulary +
				". Make sure your response is about as long as your input. The following is your input: " +
				text +
				"\n\nYour creatively rewritten response: \n\n"
		);
		// highlights the selected text that the daemon is rewriting in yellow
		quill.setSelection(range.index, range.length);
		quill.format("background", "yellow");
		quill.format("color", "black");
		quill.format("bold", true);
		// try catch block to catch the error if the model somehow fails
		try {
			console.log(response);
			// remove the header from the response if one is returned; accounts for two common ones returned by Google PaLM
			var header = response.lastIndexOf("Here is a ");
			var headerEnd = response.lastIndexOf(":\n\n");
			if (headerEnd != -1 && header != -1 && headerEnd - header < 15) {
				response = response.substring(headerEnd + 2, response.length);
			} else {
				header = response.lastIndexOf("response:\n\n");
				if (header != -1) {
					response = response.substring(header + 11, response.length);
				}
			}
			console.log(response);
		} catch (error) {
			// catch error if model somehow fails
			console.log(error);
			alert("Oops! Something went wrong. Please try again.");
			// restore the daemons to their original state
			document.getElementById("creative-mastermind").innerHTML = `
				<b>Creative Mastermind</b>
				<span class="tooltips" id="hover-text-creative-mastermind">
				I will rewrite your writing in a more creative fashion, which could include humor, figurative language, and advanced vocabulary.
				</span>
			`;
			document.getElementById("helpful-assistant").disabled = false;
			document.getElementById("devils-advocate").disabled = false;
			return;
		}
		document.getElementById(
			"creative-mastermind"
		).innerHTML = `<b>Creative Mastermind</b>
			<span class="tooltips" id="hover-text-creative-mastermind">
			I will rewrite your writing in a more creative fashion, which could include humor, figurative language, and advanced vocabulary.
			</span>`;
		// create a box below the highlighted text to enter the rewritten text
		var replacementBox = document.createElement("div");
		replacementBox.setAttribute("id", "replacement-box");
		replacementBox.setAttribute(
			"style",
			"width: fit-content; margin: 10px 0px;"
		);
		replacementBox.innerHTML = `
		<div style="display: flex; flex-direction: column; align-items: center;">
			<b>Creative Mastermind's Idea:</b>
			<textarea id="replacement-textarea" rows="7" cols="100" style="margin-top: 10px;"></textarea>
			<div style="display: flex; justify-content: flex-end; width: 100%;">
				<button id="creative-mastermind-replace-button" style="margin-top: 10px;">Replace</button>
				<button id="creative-mastermind-dismiss-button" style="margin-top: 10px;">Dismiss</button>
			</div>
		</div>
		`;
		document
			.getElementById("fine-tune-daemons")
			.appendChild(replacementBox);
		document.getElementById("replacement-textarea").value = response; // set the value of the replacement box to the response
		document.getElementById("replacement-textarea").focus();
		// add event listener to the dismiss button to remove the replacement box when clicked
		document
			.getElementById("creative-mastermind-dismiss-button")
			.addEventListener("click", function () {
				document.getElementById("replacement-box").remove();
				document.getElementById("creative-mastermind").innerHTML = `
					<b>Creative Mastermind</b>
					<span class="tooltips" id="hover-text-creative-mastermind">
					I will rewrite your writing in a more creative fashion, which could include humor, figurative language, and advanced vocabulary.
					</span>
				`;
				document.getElementById("helpful-assistant").disabled = false;
				document.getElementById("devils-advocate").disabled = false;
			});
		// add event listener to the replace button to replace the selected text with the rewritten text and remove the replacement box
		document
			.getElementById("creative-mastermind-replace-button")
			.addEventListener("click", function () {
				var replacementText = document.getElementById(
					"replacement-textarea"
				).value;
				quill.deleteText(0, quill.getLength());
				quill.insertText(0, replacementText);
				document.getElementById("replacement-box").remove();
				document.getElementById("creative-mastermind").innerHTML = `
					<b>Creative Mastermind</b>
					<span class="tooltips" id="hover-text-creative-mastermind">
					I will rewrite your writing in a more creative fashion, which could include humor, figurative language, and advanced vocabulary.
					</span>
				`;
				document.getElementById("helpful-assistant").disabled = false;
				document.getElementById("devils-advocate").disabled = false;
			});

		document.getElementById("helpful-assistant").disabled = false;
		document.getElementById("devils-advocate").disabled = false;
	});
