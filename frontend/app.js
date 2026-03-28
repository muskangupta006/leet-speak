document.getElementById('fetchDataBtn').addEventListener('click', async () => {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = 'Loading...';
    
    try {
        // Assuming backend will run on port 3000 locally
        const response = await fetch('http://localhost:3000/api/data');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        resultDiv.innerHTML = `<strong>Success:</strong> ${data.message}`;
        resultDiv.style.color = '#03dac6';
    } catch (error) {
        resultDiv.innerHTML = `<strong>Error:</strong> Could not connect to backend. Make sure it's running!`;
        resultDiv.style.color = '#cf6679';
        console.error('Error fetching data:', error);
    }
});
