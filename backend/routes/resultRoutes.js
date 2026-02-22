const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

const resultsPath = path.join(__dirname, '../data/results.json');

// Helper function to read results file
const getResults = async () => {
  const data = await fs.readFile(resultsPath, 'utf8');
  return JSON.parse(data);
};

// Validation helper for required fields
const validateResultInput = (data) => {
  const errors = [];
  if (typeof data.userAge !== 'number' || data.userAge < 0 || data.userAge > 150) {
    errors.push('userAge must be a valid number');
  }
  if (!Array.isArray(data.attempts) || data.attempts.length === 0) {
    errors.push('attempts must be a non-empty array');
  }
  if (typeof data.averageBalanceTime !== 'number' || data.averageBalanceTime < 0) {
    errors.push('averageBalanceTime must be a valid positive number');
  }
  if (!data.assessment || typeof data.assessment !== 'object') {
    errors.push('assessment is required and must be an object');
  } else {
    if (!data.assessment.category || typeof data.assessment.category !== 'string') {
      errors.push('assessment.category is required and must be a string');
    }
    if (!data.assessment.ageGroup || typeof data.assessment.ageGroup !== 'string') {
      errors.push('assessment.ageGroup is required and must be a string');
    }
  }
  return errors;
};

// Get all results
router.get('/results', async (req, res) => {
  try {
    const results = await getResults();
    res.json(results);
  } catch (error) {
    console.error('Error reading results:', error);
    res.status(500).json({ error: 'Error fetching results' });
  }
});

// Save new result
router.post('/results', async (req, res) => {
  try {
    const { userAge, attempts, averageBalanceTime, assessment } = req.body;

    // Input validation
    const validationErrors = validateResultInput(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: validationErrors });
    }

    const results = await getResults();

    const newResult = {
      timestamp: new Date().toISOString(),
      userAge,
      attempts,
      averageBalanceTime,
      assessment: {
        category: assessment.category,
        ageGroup: assessment.ageGroup,
        expectedRange: assessment.expectedRange || "",
        recommendedExercises: assessment.recommendedExercises || []
      }
    };

    results.testResults.push(newResult);
    await fs.writeFile(resultsPath, JSON.stringify(results, null, 2));

    res.status(201).json(newResult);
  } catch (error) {
    console.error('Error saving result:', error);
    res.status(500).json({ error: 'Error saving result' });
  }
});

// Update result
router.put('/results/:resultId', async (req, res) => {
  try {
    const { userAge, attempts, averageBalanceTime, assessment } = req.body;

    // Validate resultId is a number and within bounds
    const resultId = parseInt(req.params.resultId, 10);
    if (isNaN(resultId) || resultId < 0) {
      return res.status(400).json({ error: 'Invalid resultId: must be a non-negative integer' });
    }

    const results = await getResults();

    // Check array bounds before access
    if (!results.testResults || resultId >= results.testResults.length) {
      return res.status(404).json({ error: 'Result not found' });
    }

    // Input validation
    const validationErrors = validateResultInput(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: validationErrors });
    }

    const updatedResult = {
      ...results.testResults[resultId],
      userAge,
      attempts,
      averageBalanceTime,
      assessment: {
        category: assessment.category,
        ageGroup: assessment.ageGroup,
        expectedRange: assessment.expectedRange || "",
        recommendedExercises: assessment.recommendedExercises || []
      }
    };

    results.testResults[resultId] = updatedResult;
    await fs.writeFile(resultsPath, JSON.stringify(results, null, 2));
    res.json({ success: true, result: updatedResult });
  } catch (error) {
    console.error('Error updating result:', error);
    res.status(500).json({ error: 'Error updating result' });
  }
});

// Delete result
router.delete('/results/:resultId', async (req, res) => {
  try {
    // Validate resultId is a number and within bounds
    const resultId = parseInt(req.params.resultId, 10);
    if (isNaN(resultId) || resultId < 0) {
      return res.status(400).json({ error: 'Invalid resultId: must be a non-negative integer' });
    }

    const results = await getResults();

    // Check array bounds before access
    if (!results.testResults || resultId >= results.testResults.length) {
      return res.status(404).json({ error: 'Result not found' });
    }

    results.testResults.splice(resultId, 1);
    await fs.writeFile(resultsPath, JSON.stringify(results, null, 2));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting result:', error);
    res.status(500).json({ error: 'Error deleting result' });
  }
});

module.exports = router;
