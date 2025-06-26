const BASE_URL = 'https://cookgpt-backend.onrender.com';
document.getElementById('healthForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const heightCm = document.getElementById('height').value;
  const weightKg = document.getElementById('weight').value;

  const data = {
    heightCm: parseFloat(heightCm),
    weightKg: parseFloat(weightKg)
  };

  try {
    const res = await fetch(`${BASE_URL}/api/health/suggestions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await res.json();

    if (!res.ok) {
      console.error("Backend responded with:", result);
      throw new Error("Failed to fetch health suggestions.");
    }

    // 🧠 Display BMI and target calories
    document.getElementById('bmiResult').innerHTML = `
      <h3>📏 BMI: ${result.bmi} (${result.category})</h3>
      <p>🎯 Target Daily Calories: ${result.calorieTarget} kcal</p>
    `;

    // 🔍 Display AI suggestions (SerpAPI)
    const aiHTML = result.suggestions.map(s =>
      `<p><strong>${s.title}</strong>: <a href="${s.link}" target="_blank">${s.link}</a><br>${s.snippet}</p>`
    ).join("");
    document.getElementById('aiSuggestions').innerHTML = `<h3>🧠 AI Suggestions</h3>${aiHTML}`;

    // 🥗 Display meal suggestions (Spoonacular)
    const meals = result.spoonacularMealPlan?.meals || [];
    const mealHTML = meals.map(m =>
      `<div style="margin-bottom: 15px;">
        <strong>${m.title}</strong><br>
        <a href="https://spoonacular.com/recipes/${m.title.replace(/\s+/g, '-').toLowerCase()}-${m.id}" target="_blank">View Recipe</a>
      </div>`
    ).join("");
    document.getElementById('mealRecommendations').innerHTML = `<h3>🥗 Recommended Meals</h3>${mealHTML}`;

  } catch (err) {
    console.error("Error fetching health suggestions:", err);
  }
});
