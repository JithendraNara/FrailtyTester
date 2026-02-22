import { useState, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { resetStage } from "../../store/slices/stageSlice";
import { resetTest } from "../../store/slices/testSlice";
import { viewHistory } from "../../store/slices/stageSlice";
import { setCurrentResult } from "../../store/slices/resultSlice";
import { assessBalance } from "../../utils/assessmentResult";
import { useGetExercisesByCategoryQuery } from "../../services/exercisesAPI";
import { useSaveResultMutation } from "../../services/resultAPI";

const TestResultsTable = ({ results }) => (
    <table>
        <thead>
            <tr className="bg-gray-300">
                <th className="text-xl px-6 py-3">Attempt</th>
                <th className="text-xl px-6 py-3">Length</th>
            </tr>
        </thead>
        <tbody>
            {results.map((result, index) => (
                <tr key={index} className="odd:bg-white even:bg-gray-50 border-b border-gray-200">
                    <td className="capitalize">
                        {result.foot} Foot {result.attempt}
                    </td>
                    <td className="capitalize">
                        {result.balanceScore.toFixed(2)} seconds
                    </td>
                </tr>
            ))}
        </tbody>
    </table>
);

const NormsTable = () => (
    <table>
        <tbody className="bg-gray-300">
            <tr>
                <th className="text-xl px-6 py-3">Age (years)</th>
                <th className="text-xl px-6 py-3">Expected Duration</th>
            </tr>
            {[
                { age: "20-40", duration: "30-40" },
                { age: "40-50", duration: "25-35" },
                { age: "50-60", duration: "20-30" },
                { age: "60+", duration: "15-25" }
            ].map(({ age, duration }, index) => (
                <tr key={index} className="odd:bg-white even:bg-gray-50 border-b border-gray-200">
                    <td>{age}</td>
                    <td>{duration} seconds</td>
                </tr>
            ))}
        </tbody>
    </table>
);

const AgeInput = ({ age, setAge, handleEvaluate }) => (
    <div className="mt-4">
        <h3 className="text-xl font-semibold mb-2">Enter Your Age to Analyze Results:</h3>
        <input
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="Enter your age"
            className="px-4 py-2 border rounded-md text-xl"
        />
        <button
            onClick={handleEvaluate}
            className="ml-4 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
        >
            Analyze Results
        </button>
    </div>
);

const ExerciseSuggestions = ({ exercises, isLoading }) => {
    if (isLoading) {
        return <div>Loading exercise suggestions...</div>;
    }

    if (!exercises?.length) {
        return <div>No exercise suggestions available.</div>;
    }

    return (
        <div className="mt-6 text-left max-w-xl text-xl backdrop-blur-sm backdrop-brightness-110">
            <h3 className="font-bold mb-3">Recommended Balance Exercises:</h3>
            <ul className="font-semibold pl-5 space-y-2 text-left">
                {exercises.map((exercise, index) => (
                    <li key={index}>
                        <span className="font-bold">{exercise.name}:</span> {exercise.description}
                    </li>
                ))}
            </ul>
        </div>
    );
};

const ResultsScreen = () => {
    const results = useSelector((state) => state.test.testResults);
    const dispatch = useDispatch();
    const [age, setAge] = useState("");
    const [feedback, setFeedback] = useState("");
    const [showExercises, setShowExercises] = useState(false);
    const [ageGroup, setAgeGroup] = useState(null);
    const [performanceCategory, setPerformanceCategory] = useState(null);
    const [resultSaved, setResultSaved] = useState(false);

    const [saveResult] = useSaveResultMutation();

    // Add RTK Query hook - pass object with ageGroup and category
    const { data: exercises, isLoading } = useGetExercisesByCategoryQuery(
        ageGroup && performanceCategory ? { ageGroup, category: performanceCategory } : null,
        { skip: !ageGroup || !performanceCategory }
    );

    const averageBalance = useMemo(() => {
        if (results.length === 0) return 0;
        const total = results.reduce((sum, r) => sum + r.balanceScore, 0);
        return (total / results.length).toFixed(2);
    }, [results]);

    const handleEvaluate = async () => {
        if (isNaN(age) || age < 1) {
            setFeedback("Please enter a valid age to evaluate your results.");
            return;
        }

        const assessment = assessBalance(parseInt(age), parseFloat(averageBalance));

        if (!assessment.isValid) {
            setFeedback(assessment.message);
            return;
        }

        setAgeGroup(assessment.ageGroup);
        setPerformanceCategory(assessment.category);
        setShowExercises(assessment.category === "Below Average");

        const feedbackMessages = {
            "Below Average": `Your average balance time is ${averageBalance} seconds. Below Average - Consider practicing balance exercises.`,
            "Average": `Your average balance time is ${averageBalance} seconds. Within Norms - You're within the expected range!`,
            "Above Average": `Your average balance time is ${averageBalance} seconds. Exceeded Norms - You exceeded expectations!`
        };

        // Automatically save results after evaluation
        try {
            const savedResult = await saveResult({
                userAge: parseInt(age),
                attempts: results,
                averageBalanceTime: parseFloat(averageBalance),
                assessment: {
                    category: assessment.category,
                    ageGroup: assessment.ageGroup
                }
            }).unwrap();

            dispatch(setCurrentResult(savedResult));
            setResultSaved(true);
            setFeedback(`${feedbackMessages[assessment.category]}\nResults saved successfully!`);
        } catch (error) {
            setFeedback(`${feedbackMessages[assessment.category]}\nError saving results: ${error.message}`);
        }
    };

    return (
        <div className="flex flex-col items-center text-center p-6">
            <table>
                <tbody>
                    <tr>
                        <td className="text-xl px-2 py-1">
                            <h2 className="text-xl font-bold mb-2">Test Results</h2>
                            <TestResultsTable results={results} />
                        </td>
                        <td colSpan="10" className="px-2 py-1">
                            <h2 className="text-xl font-bold mb-2">Norms per Age</h2>
                            <NormsTable />
                        </td>
                    </tr>
                </tbody>
            </table>

            <AgeInput age={age} setAge={setAge} handleEvaluate={handleEvaluate} />

            {feedback && (
                <div className="mt-4 text-xl font-semibold">{feedback}</div>
            )}

            {showExercises && (
                <ExerciseSuggestions
                    exercises={exercises}
                    isLoading={isLoading}
                />
            )}

            <button
                onClick={() => {
                    dispatch(resetTest());
                    dispatch(resetStage());
                }}
                className="mt-6 px-6 py-3 bg-lightBlue text-white rounded-md font-semibold hover:bg-darkBlue"
            >
                Restart Test
            </button>
            <button
                onClick={() => dispatch(viewHistory())}
                className="px-6 py-3 bg-lightBlue text-white rounded-md font-semibold hover:bg-darkBlue"
                disabled={!resultSaved}
            >
                View History
            </button>
        </div>
    );
};

export default ResultsScreen;
