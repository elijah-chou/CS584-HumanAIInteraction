// SCRIPT FILE TO HANDLE HOVERS ON THE DAEMON BUTTONS
document
	.querySelector("#helpful-assistant")
	.addEventListener("mouseover", function () {
		document.querySelector("#hover-text-helpful-assistant").style.display =
			"block";
	});

document
	.querySelector("#helpful-assistant")
	.addEventListener("mouseout", function () {
		document.querySelector("#hover-text-helpful-assistant").style.display =
			"none";
	});

document
	.querySelector("#devils-advocate")
	.addEventListener("mouseover", function () {
		document.querySelector("#hover-text-devils-advocate").style.display =
			"block";
	});

document
	.querySelector("#devils-advocate")
	.addEventListener("mouseout", function () {
		document.querySelector("#hover-text-devils-advocate").style.display =
			"none";
	});

document
	.querySelector("#creative-mastermind")
	.addEventListener("mouseover", function () {
		document.querySelector(
			"#hover-text-creative-mastermind"
		).style.display = "block";
	});

document
	.querySelector("#creative-mastermind")
	.addEventListener("mouseout", function () {
		document.querySelector(
			"#hover-text-creative-mastermind"
		).style.display = "none";
	});
