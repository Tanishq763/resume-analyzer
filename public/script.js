async function analyze() {
    const fileInput = document.getElementById("resume");
    const jobInput = document.getElementById("job");
    const resultBox = document.getElementById("result");

    if (!fileInput.files[0]) {
        alert("Please select a PDF file first.");
        return;
    }

    const formData = new FormData();
    formData.append("resume", fileInput.files[0]);
    formData.append("jobDescription", jobInput.value);

    resultBox.innerText = "Processing... Please wait.";

    try {
        const response = await fetch("/analyze", {
            method: "POST",
            body: formData
        });

        const data = await response.json();
        
        if (!response.ok) {
            resultBox.innerText = "Error: " + data.result;
        } else {
            resultBox.innerText = data.result;
        }
    } catch (error) {
        resultBox.innerText = "Connection Error: Ensure the server is running.";
    }
}