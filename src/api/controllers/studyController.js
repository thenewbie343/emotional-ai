const { createClient } = require("@supabase/supabase-js");
const { generateAiResponse } = require("../../services/aiRouter");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Helper to award XP
async function addXpBackend(userId, amount) {
  try {
    const { data: currentData } = await supabase
      .from('sai_xp')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!currentData) {
      await supabase.from('sai_xp').insert([{ user_id: userId, xp: amount, level: 1, last_active: new Date().toISOString() }]);
      return;
    }

    const newXp = currentData.xp + amount;
    let level = 1;
    const XP_LEVELS = [0, 25, 75, 150, 250, 375, 550, 750, 1000, 1500];
    for (let i = 0; i < XP_LEVELS.length; i++) {
      if (newXp >= XP_LEVELS[i]) {
        level = i + 1;
      } else {
        break;
      }
    }

    await supabase
      .from('sai_xp')
      .update({ 
        xp: newXp, 
        level, 
        last_active: new Date().toISOString() 
      })
      .eq('user_id', userId);
  } catch (err) {
    console.error("Failed to update XP on backend:", err.message);
  }
}

// 1. Generate Custom Roadmap via AI
exports.generateCustomRoadmap = async (req, res) => {
  const { userId, topic } = req.body;
  if (!userId || !topic) return res.status(400).json({ error: "Missing userId or topic" });

  try {
    const systemPrompt = `You are SAI, a PREMIUM, STRICT, and HIGHLY DEMANDING study coach and curriculum planner. Generate a highly structured, logical, multi-stage learning roadmap/syllabus for the topic requested by the user. 
You MUST respond with a raw JSON array of stages only. Do not wrap in markdown code blocks like \`\`\`json. Your response must be parsed directly with JSON.parse.
Each item in the array must be an object representing a stage:
{
  "stage": "Stage name (e.g. 1. Fundamentals of Physics)",
  "lessons": [
    {"name": "Lesson title (e.g. Newton's First Law)", "completed": false},
    {"name": "Lesson title (e.g. Friction and Gravity)", "completed": false}
  ]
}
Generate exactly 4-5 stages with 2-3 lessons each. Make the lessons progressive, clear, and comprehensive. Hold the student to the highest standard.`;

    const messages = [{ role: "user", content: `Generate a syllabus for: ${topic}` }];
    const aiText = await generateAiResponse("curious", messages, systemPrompt, "sai");
    
    if (!aiText) {
      throw new Error("AI providers are currently unavailable or rate limited. Please check your API keys or try again later.");
    }

    // Clean response of potential markdown wrapping
    let cleanedText = aiText.trim();
    if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    }

    const syllabus = JSON.parse(cleanedText);

    // Save to DB
    const { data, error } = await supabase
      .from("study_roadmaps")
      .insert([{ user_id: userId, topic, syllabus }])
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("Roadmap generation error:", err);
    res.status(500).json({ error: err.message });
  }
};

// 2. Save Curated Roadmap Preset
exports.saveRoadmap = async (req, res) => {
  const { userId, topic, syllabus } = req.body;
  if (!userId || !topic || !syllabus) return res.status(400).json({ error: "Missing fields" });

  try {
    const { data, error } = await supabase
      .from("study_roadmaps")
      .insert([{ user_id: userId, topic, syllabus }])
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 3. List Roadmaps
exports.listRoadmaps = async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  try {
    const { data, error } = await supabase
      .from("study_roadmaps")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. Update Lesson Status
exports.updateLessonStatus = async (req, res) => {
  const { userId, roadmapId, stageIndex, lessonIndex, completed } = req.body;
  if (!userId || !roadmapId) return res.status(400).json({ error: "Missing fields" });

  try {
    const { data: roadmap, error: fetchErr } = await supabase
      .from("study_roadmaps")
      .select("*")
      .eq("id", roadmapId)
      .eq("user_id", userId)
      .single();

    if (fetchErr) throw fetchErr;

    const syllabus = [...roadmap.syllabus];
    syllabus[stageIndex].lessons[lessonIndex].completed = completed;

    const { data, error: updateErr } = await supabase
      .from("study_roadmaps")
      .update({ syllabus })
      .eq("id", roadmapId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // Award 20 XP if lesson completed
    if (completed) {
      await addXpBackend(userId, 20);
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 5. Manage Tasks
exports.createTask = async (req, res) => {
  const { userId, taskName, scheduledDate } = req.body;
  if (!userId || !taskName) return res.status(400).json({ error: "Missing fields" });

  try {
    const { data, error } = await supabase
      .from("study_tasks")
      .insert([{ user_id: userId, task_name: taskName, scheduled_date: scheduledDate || new Date().toISOString().split('T')[0] }])
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.listTasks = async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  try {
    const { data, error } = await supabase
      .from("study_tasks")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.toggleTaskCompleted = async (req, res) => {
  const { userId, taskId, completed } = req.body;
  if (!userId || !taskId) return res.status(400).json({ error: "Missing fields" });

  try {
    const { data, error } = await supabase
      .from("study_tasks")
      .update({ completed })
      .eq("id", taskId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;

    // Award 15 XP if task completed
    if (completed) {
      await addXpBackend(userId, 15);
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 6. Log Study/Pomodoro Session
exports.logStudySession = async (req, res) => {
  const { userId, taskName, durationMins } = req.body;
  if (!userId || !durationMins) return res.status(400).json({ error: "Missing fields" });

  try {
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Log session inside study_logs
    await supabase.from("study_logs").insert([{
      user_id: userId,
      date: todayStr,
      duration_mins: durationMins
    }]);

    // 2. If it is attached to a study_task, mark it completed
    if (taskName) {
      const { data: matchedTask } = await supabase
        .from("study_tasks")
        .select("id")
        .eq("user_id", userId)
        .eq("task_name", taskName)
        .eq("completed", false)
        .limit(1)
        .maybeSingle();

      if (matchedTask) {
        await supabase
          .from("study_tasks")
          .update({ completed: true, duration_mins: durationMins })
          .eq("id", matchedTask.id);
      }
    }

    // 3. Award 15 XP for completing a Pomodoro session
    await addXpBackend(userId, 15);

    res.json({ success: true, xpEarned: 15 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 7. Get Heatmap Calendar Data
exports.getHeatmapData = async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  try {
    // Fetch logs from the past 3 months
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const { data: logs, error } = await supabase
      .from("study_logs")
      .select("date, duration_mins")
      .eq("user_id", userId)
      .gte("date", threeMonthsAgo.toISOString().split('T')[0]);

    if (error) throw error;

    // Group logs by date
    const grouped = {};
    if (logs) {
      logs.forEach(log => {
        grouped[log.date] = (grouped[log.date] || 0) + log.duration_mins;
      });
    }

    res.json(grouped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 8. Generate Lesson Quiz via AI
exports.generateQuiz = async (req, res) => {
  const { topic } = req.body;
  if (!topic) return res.status(400).json({ error: "Missing topic" });

  try {
    const systemPrompt = `You are SAI, an analytical examiner. Generate a quiz based on the user's requested topic/lesson.
You MUST respond with a raw JSON object containing the quiz. Do not wrap in markdown code blocks.
The JSON object must have this structure:
{
  "multipleChoice": [
    {
      "question": "Question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answerIndex": 0 // 0-indexed correct answer
    },
    ... (generate exactly 3 multiple choice questions)
  ],
  "openEnded": {
    "question": "An open-ended, deep conceptual question checking the user's understanding of this lesson."
  }
}`;

    const messages = [{ role: "user", content: `Generate a quiz for the lesson: ${topic}` }];
    const aiText = await generateAiResponse("curious", messages, systemPrompt, "sai");

    let cleanedText = aiText.trim();
    if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    }

    const quiz = JSON.parse(cleanedText);
    res.json(quiz);
  } catch (err) {
    console.error("Quiz generation error:", err);
    res.status(500).json({ error: err.message });
  }
};

// 9. Evaluate Open-Ended Feynman Technique Answer
exports.evaluateQuizAnswer = async (req, res) => {
  const { userId, question, explanation } = req.body;
  if (!userId || !question || !explanation) return res.status(400).json({ error: "Missing fields" });

  try {
    const systemPrompt = `You are SAI, a logical critique. Evaluate the user's open-ended explanation to the question: "${question}".
The user's response is: "${explanation}".
Analyze the explanation for:
1. Missing details or context.
2. Misconceptions or inaccuracies.
3. Logical leaps or contradictions.
Provide constructive feedback. Explain where their understanding is strong and pinpoint exactly where the logic gaps are. Ask 1 follow-up question to help them clarify the concept.`;

    const messages = [{ role: "user", content: `Here is my explanation: ${explanation}` }];
    const feedback = await generateAiResponse("curious", messages, systemPrompt, "sai");

    // Award 25 XP for completing an active recall Feynman session
    await addXpBackend(userId, 25);

    res.json({ feedback, xpEarned: 25 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
