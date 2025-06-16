const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const USDA_API_KEY = process.env.USDA_API_KEY;
const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY;
const SERP_API_KEY =  process.env.SERP_API_KEY;; // Provided key

// 🥕 USDA-Based Recipes Route
app.post('/api/recipes', async (req, res) => {
  const { ingredients } = req.body;
  if (!ingredients) {
    return res.status(400).json({ error: 'Missing ingredients' });
  }

  try {
    const query = encodeURIComponent(ingredients);
    const apiUrl = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${query}&pageSize=5&api_key=${USDA_API_KEY}`;
    const response = await fetch(apiUrl);
    const json = await response.json();

    if (!json.foods || json.foods.length === 0) {
      return res.status(200).json({ recipes: [] });
    }

    const recipes = json.foods.map(food => ({
      title: food.description,
      summary: food.foodCategory || 'No description available',
      calories: food.foodNutrients?.find(n => n.nutrientName === 'Energy')?.value || 0,
      protein: food.foodNutrients?.find(n => n.nutrientName === 'Protein')?.value || 0,
      carbs: food.foodNutrients?.find(n => n.nutrientName === 'Carbohydrate, by difference')?.value || 0,
      fat: food.foodNutrients?.find(n => n.nutrientName === 'Total lipid (fat)')?.value || 0
    }));

    // Suggested items
    let suggestions = [];
    const mainCategory = json.foods[0]?.foodCategory;

    if (mainCategory) {
      const suggestUrl = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${mainCategory}&pageSize=3&api_key=${USDA_API_KEY}`;
      const suggestRes = await fetch(suggestUrl);
      const suggestJson = await suggestRes.json();

      suggestions = suggestJson.foods.map(food => ({
        title: food.description,
        summary: `Suggested from category: ${mainCategory}`,
        calories: food.foodNutrients?.find(n => n.nutrientName === 'Energy')?.value || 0,
        protein: food.foodNutrients?.find(n => n.nutrientName === 'Protein')?.value || 0,
        carbs: food.foodNutrients?.find(n => n.nutrientName === 'Carbohydrate, by difference')?.value || 0,
        fat: food.foodNutrients?.find(n => n.nutrientName === 'Total lipid (fat)')?.value || 0
      }));
    }

    res.json({ recipes, suggestions });
  } catch (err) {
    console.error('USDA API Error:', err);
    res.status(500).json({ error: 'Failed to fetch data from USDA API' });
  }
});

// 🤖 AI-Like Meal Suggestions Using SerpAPI
app.post('/api/generate-meals', async (req, res) => {
  const { ingredients, goal = 'healthy' } = req.body;

  if (!ingredients) {
    return res.status(400).json({ error: 'Missing ingredients' });
  }

  try {
    const query = `easy ${goal} recipes with ${ingredients}`;
    const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&hl=en&gl=us&api_key=${SERP_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    const meals = data.organic_results?.slice(0, 5).map(result => ({
      title: result.title,
      summary: result.snippet,
      link: result.link,
      calories: Math.floor(Math.random() * 200 + 300),
      protein: Math.floor(Math.random() * 30 + 20),
      carbs: Math.floor(Math.random() * 50 + 40),
      fat: Math.floor(Math.random() * 20 + 10)
    })) || [];

    res.json({ meals });
  } catch (error) {
    console.error('SerpAPI Meal Generation Error:', error);
    res.status(500).json({ error: 'Failed to fetch suggestions from SerpAPI' });
  }
});

// 🥗 Auto Meal Plan Route Based on Ingredients
app.post('/api/recipes/plan', async (req, res) => {
  const { ingredients } = req.body;

  if (!ingredients) {
    return res.status(400).json({ error: 'Missing ingredients' });
  }

  try {
    const query = `easy recipes using ${ingredients}`;
    const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&hl=en&gl=us&api_key=${SERP_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    const plan = data.organic_results?.slice(0, 5).map(result => ({
      title: result.title,
      summary: result.snippet || 'No summary available.',
      link: result.link || '',
      ingredients: generateIngredientsFromTitle(result.title)
    })) || [];

    res.json({ plan });
  } catch (err) {
    console.error('Meal Plan Error:', err);
    res.status(500).json({ error: 'Failed to fetch meal plan from SerpAPI' });
  }
});

// 🍽️ Get Steps and Nutrition Using SerpAPI
app.get('/api/recipe-info', async (req, res) => {
  const query = req.query.query;
  if (!query) return res.status(400).json({ error: 'Missing query' });

  try {
    const searchUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(query + ' recipe with steps and nutrition info')}&hl=en&gl=us&api_key=${SERP_API_KEY}`;
    const response = await fetch(searchUrl);
    const data = await response.json();

    const results = data.organic_results || [];
    const topResults = results.slice(0, 2).map(result => ({
      title: result.title,
      link: result.link,
      snippet: result.snippet
    }));

    res.json({ results: topResults });
  } catch (err) {
    console.error('SerpAPI recipe-info Error:', err);
    res.status(500).json({ error: 'Failed to fetch recipe info' });
  }
});
// 🧠 BMI-Based Meal and Routine Suggestions
app.post('/api/health/suggestions', async (req, res) => {
  const { heightCm, weightKg } = req.body;

if (!heightCm || !weightKg) {
  return res.status(400).json({ error: 'Missing height or weight' });
}

const heightM = heightCm / 100;
const bmi = weightKg / (heightM * heightM);

  let bmiCategory = '';
  let targetCalories = 2000;
  let diet = '';

  if (bmi < 18.5) {
    bmiCategory = 'Underweight';
    targetCalories = 2700;
    diet = 'high-protein';
  } else if (bmi < 24.9) {
    bmiCategory = 'Normal';
    targetCalories = 2000;
  } else if (bmi < 29.9) {
    bmiCategory = 'Overweight';
    targetCalories = 1600;
    diet = 'low-carb';
  } else {
    bmiCategory = 'Obese';
    targetCalories = 1300;
    diet = 'low-carb';
  }

  try {
    // Search-based AI suggestions
    const query = `meal and workout routine for ${bmiCategory.toLowerCase()} person to stay healthy`;
    const serpUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&hl=en&gl=us&api_key=${SERP_API_KEY}`;
    const serpResponse = await fetch(serpUrl);
    const serpData = await serpResponse.json();

    const aiSuggestions = serpData.organic_results?.slice(0, 3).map(item => ({
      title: item.title,
      snippet: item.snippet,
      link: item.link
    })) || [];

    // Meal plan from Spoonacular
    const spoonUrl = `https://api.spoonacular.com/mealplanner/generate?timeFrame=day&targetCalories=${targetCalories}&diet=${diet}&apiKey=${SPOONACULAR_API_KEY}`;
    const spoonResponse = await fetch(spoonUrl);
    const spoonData = await spoonResponse.json();

    const meals = (spoonData.meals || []).map(m => ({
      title: m.title,
      image: `https://spoonacular.com/recipeImages/${m.id}-312x231.jpg`,
      id: m.id
    }));

    res.json({
      bmi: bmi.toFixed(2),
      calories: targetCalories,
      aiSuggestions,
      meals
    });
  } catch (err) {
    console.error('BMI Routine Error:', err);
    res.status(500).json({ error: 'Failed to fetch BMI suggestions' });
  }
});

// Utility: Generate Ingredient Guesses from Titles
function generateIngredientsFromTitle(title) {
  const lower = title.toLowerCase();
  const items = [];

  if (lower.includes("chicken")) items.push("Chicken breast");
  if (lower.includes("egg")) items.push("Eggs");
  if (lower.includes("salad")) items.push("Lettuce", "Tomato", "Olive oil");
  if (lower.includes("toast")) items.push("Bread", "Butter");
  if (lower.includes("pasta")) items.push("Pasta", "Tomato sauce");
  if (lower.includes("rice")) items.push("Rice", "Vegetables");
  if (items.length === 0) items.push("Ingredient info not available");

  return items;
}

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ CookGPT server running at http://localhost:${PORT}`);
});