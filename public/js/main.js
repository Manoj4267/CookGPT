
// === Daily Nutrition Stats ===
let dailyStats = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0
};

// === Chart Setup ===
const chartCtx = document.getElementById('nutritionChart').getContext('2d');
let nutritionChart = new Chart(chartCtx, {
  type: 'bar',
  data: {
    labels: ['Calories', 'Protein', 'Carbs', 'Fat'],
    datasets: [{
      label: 'Total Today',
      data: [0, 0, 0, 0],
      backgroundColor: ['#ff6384', '#36a2eb', '#ffcd56', '#4bc0c0']
    }]
  },
  options: {
    responsive: true,
    scales: {
      y: { beginAtZero: true }
    }
  }
});

// === Utility Functions ===
function sanitize(str = '') {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function updateChart() {
  nutritionChart.data.datasets[0].data = [
    dailyStats.calories,
    dailyStats.protein,
    dailyStats.carbs,
    dailyStats.fat
  ];
  nutritionChart.update();
}

function clearMealInputs() {
  ['meal-name', 'meal-calories', 'meal-protein', 'meal-carbs', 'meal-fat'].forEach(id => {
    const input = document.getElementById(id);
    if (input) input.value = '';
  });
}

function prefillMeal(title, calories, protein, carbs, fat) {
  document.getElementById('meal-name').value = title;
  document.getElementById('meal-calories').value = calories || 0;
  document.getElementById('meal-protein').value = protein || 0;
  document.getElementById('meal-carbs').value = carbs || 0;
  document.getElementById('meal-fat').value = fat || 0;
}

function logMeal() {
  const name = document.getElementById('meal-name').value.trim();
  const calories = parseFloat(document.getElementById('meal-calories').value) || 0;
  const protein = parseFloat(document.getElementById('meal-protein').value) || 0;
  const carbs = parseFloat(document.getElementById('meal-carbs').value) || 0;
  const fat = parseFloat(document.getElementById('meal-fat').value) || 0;

  if (!name) {
    alert('Please enter a meal name!');
    return;
  }

  dailyStats.calories += calories;
  dailyStats.protein += protein;
  dailyStats.carbs += carbs;
  dailyStats.fat += fat;

  updateChart();
  clearMealInputs();
}

// === Recipe Search ===
document.getElementById('ingredientForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const ingredientsInput = document.getElementById('search-ingredients');
  if (!ingredientsInput) return;

  const ingredients = ingredientsInput.value.trim();
  if (!ingredients) return;

  try {
    const res = await fetch('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredients })
    });

    const data = await res.json();
    renderRecipes(data.recipes || [], 'recipes');
    renderRecipes(data.suggestions || [], 'suggestions', true);
    scrollToResults();
  } catch (error) {
    console.error('Fetch error:', error);
    alert('Failed to fetch recipe data.');
  }
});

function renderRecipes(list, containerId, isSuggestion = false) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '';

  if (!list.length) {
    container.innerHTML = `<p>${isSuggestion ? 'No suggestions.' : 'No recipes found.'}</p>`;
    return;
  }

  if (isSuggestion) {
    const header = document.createElement('h3');
    header.textContent = '💡 Ingredient-Based Suggestions';
    container.appendChild(header);
  }

  list.forEach(item => {
    const div = document.createElement('div');
    div.className = `recipe${isSuggestion ? ' suggestion' : ''}`;
    div.innerHTML = `
      <h3>${sanitize(item.title)}</h3>
      <p>${sanitize(item.summary)}</p>
      <p>Calories: ${item.calories || 0} kcal</p>
      <p>Protein: ${item.protein || 0} g</p>
      <p>Carbs: ${item.carbs || 0} g</p>
      <p>Fat: ${item.fat || 0} g</p>
      <button onclick='prefillMeal("${sanitize(item.title)}", ${item.calories || 0}, ${item.protein || 0}, ${item.carbs || 0}, ${item.fat || 0})'>➕ ${isSuggestion ? 'Add Suggestion' : 'Log this Meal'}</button>
    `;
    container.appendChild(div);
  });
}

// === Auto Meal Planner ===
document.getElementById('mealPlanForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const ingredientsInput = document.getElementById('planner-ingredients');
  if (!ingredientsInput) return;

  const ingredients = ingredientsInput.value.trim();
  if (!ingredients) return;

  try {
    const res = await fetch('/api/recipes/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredients })
    });

    const data = await res.json();
    const resultsDiv = document.getElementById('mealPlanResults');
    resultsDiv.innerHTML = '';

    (data.plan || []).forEach(meal => {
      const mealCard = document.createElement('div');
      mealCard.classList.add('meal-card');

      mealCard.innerHTML = `
        <h3>🍲 ${sanitize(meal.title)}</h3>
        <p>${sanitize(meal.summary)}</p>
        <strong>Ingredients:</strong>
        <ul>${meal.ingredients.map(i => `<li>${sanitize(i)}</li>`).join('')}</ul>
        <button onclick='prefillMeal("${sanitize(meal.title)}", 350, 25, 40, 15)'>➕ Log this Meal</button>
      `;
      resultsDiv.appendChild(mealCard);
    });

    scrollToResults();
  } catch (err) {
    console.error('Planner fetch error:', err);
    alert('Failed to generate meal plan.');
  }
});

// === Theme Toggle ===
document.addEventListener("DOMContentLoaded", () => {
  const html = document.documentElement;
  const themeSwitch = document.getElementById("themeSwitch");

  const savedTheme = localStorage.getItem("theme") || "light";
  html.setAttribute("data-theme", savedTheme);
  if (themeSwitch) themeSwitch.checked = savedTheme === "dark";

  if (themeSwitch) {
    themeSwitch.addEventListener("change", () => {
      const isDark = themeSwitch.checked;
      html.setAttribute("data-theme", isDark ? "dark" : "light");
      localStorage.setItem("theme", isDark ? "dark" : "light");
    });
  }
});

// === Card + Spinner Helpers ===
function addRecipeCard(recipe) {
  const card = document.createElement("div");
  card.className = "recipe-card card-animate";
  card.innerHTML = `
    <h3>${sanitize(recipe.name)}</h3>
    <p>${sanitize(recipe.description)}</p>
  `;
  document.querySelector(".card-list").appendChild(card);

  card.addEventListener("animationend", () => {
    card.classList.remove("card-animate");
  });
}

function showSpinner() {
  const spinner = document.getElementById("loadingSpinner");
  if (spinner) spinner.style.display = "flex";
}

function hideSpinner() {
  const spinner = document.getElementById("loadingSpinner");
  if (spinner) spinner.style.display = "none";
}

async function searchRecipes(query) {
  showSpinner();
  try {
    const res = await fetch(`/api/recipes?q=${query}`);
    const recipes = await res.json();
    const container = document.querySelector(".card-list");
    container.innerHTML = "";
    recipes.forEach(recipe => addRecipeCard(recipe));
  } catch (err) {
    alert("Error loading recipes");
  } finally {
    hideSpinner();
  }
}

// === Scroll Utility ===
function scrollToResults() {
  const section = document.getElementById("mealPlanResults") || document.getElementById("recipes");
  if (section) section.scrollIntoView({ behavior: "smooth" });
}
