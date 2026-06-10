const { createClient } = require("@supabase/supabase-js");
const { generateAiResponse } = require("../../services/aiRouter");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const XP_RANKS = [
  { xpNeeded: 15000, rank: 'Legend' },
  { xpNeeded: 7500, rank: 'Mastermind' },
  { xpNeeded: 3500, rank: 'Architect' },
  { xpNeeded: 1500, rank: 'Strategist' },
  { xpNeeded: 500, rank: 'Scholar' },
  { xpNeeded: 0, rank: 'Rookie' }
];

function getRank(xp) {
  for (const r of XP_RANKS) {
    if (xp >= r.xpNeeded) return r.rank;
  }
  return 'Rookie';
}

// Helper to award XP
async function addXpBackend(userId, amount) {
  try {
    const { data: currentData } = await supabase
      .from('sai_xp')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!currentData) {
      const initXp = amount;
      const initRank = getRank(initXp);
      await supabase.from('sai_xp').insert([{ user_id: userId, xp: initXp, level: initRank, last_active: new Date().toISOString() }]);
      return { leveledUp: initRank !== 'Rookie', newRank: initRank };
    }

    const newXp = currentData.xp + amount;
    const newRank = getRank(newXp);
    const oldRank = currentData.level || 'Rookie';
    // If oldRank is a number (legacy), consider it a rank up if the new rank isn't Rookie
    const leveledUp = oldRank !== newRank && isNaN(oldRank); 
    // Wait, if oldRank is '1', isNaN('1') is false. So leveledUp will be false. 
    // Let's just do oldRank !== newRank.
    // If it's a number, they get a free rank up screen to their new rank!

    await supabase
      .from('sai_xp')
      .update({ 
        xp: newXp, 
        level: newRank, 
        last_active: new Date().toISOString() 
      })
      .eq('user_id', userId);
      
    return { leveledUp: oldRank !== newRank, newRank };
  } catch (err) {
    console.error("Failed to update XP on backend:", err.message);
    return { leveledUp: false, newRank: 'Rookie' };
  }
}

// 1. Generate Custom Roadmap via AI
exports.generateCustomRoadmap = async (req, res) => {
  const { userId, topic } = req.body;
  if (!userId || !topic) return res.status(400).json({ error: "Missing userId or topic" });

  try {
    const systemPrompt = `You are SAI, a strict and demanding study coach. Generate a structured learning roadmap for the requested topic.
CRITICAL: Respond ONLY with a raw JSON array. No markdown, no code blocks, no explanation text before or after the JSON.
Each item must be: {"stage": "Stage Name", "lessons": [{"name": "Lesson Name", "completed": false}]}
Generate exactly 4-5 stages with 2-3 lessons each. Make lessons progressive and comprehensive.`;

    const messages = [{ role: "user", content: `Generate a syllabus for: ${topic}` }];
    const aiText = await generateAiResponse("curious", messages, systemPrompt, "sai");
    
    if (!aiText) {
      return res.status(503).json({ error: "AI providers are currently unavailable. Please check your API keys on the server." });
    }

    // Robust JSON extraction — handle all common AI output formats
    let syllabus = null;
    let cleanedText = aiText.trim();

    // Strip markdown code fences (```json ... ``` or ``` ... ```)
    cleanedText = cleanedText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

    // Strip any leading text before the first [
    const firstBracket = cleanedText.indexOf('[');
    if (firstBracket > 0) {
      cleanedText = cleanedText.substring(firstBracket);
    }

    // Strip any trailing text after the last ]
    const lastBracket = cleanedText.lastIndexOf(']');
    if (lastBracket > 0 && lastBracket < cleanedText.length - 1) {
      cleanedText = cleanedText.substring(0, lastBracket + 1);
    }

    try {
      syllabus = JSON.parse(cleanedText);
    } catch (parseErr) {
      console.error("[Roadmap] JSON parse failed. Raw text:", aiText.substring(0, 500));
      return res.status(500).json({ error: "AI returned an invalid format. Please try again — the model sometimes adds extra text." });
    }

    // Validate structure
    if (!Array.isArray(syllabus) || syllabus.length === 0) {
      return res.status(500).json({ error: "AI returned an empty or non-array roadmap. Please try again." });
    }

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
    const xpRes = await addXpBackend(userId, 15);
    res.json({ success: true, xpEarned: 15, ...xpRes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 6.5 Save Forest-style Pomodoro Session
exports.savePomodoroSession = async (req, res) => {
  const { userId, subject, durationMins, completed, plantType } = req.body;
  if (!userId || !subject || !durationMins) return res.status(400).json({ error: "Missing fields" });

  try {
    const { data, error } = await supabase
      .from("sai_pomodoro_sessions")
      .insert([{
        user_id: userId,
        subject,
        duration_minutes: durationMins,
        completed,
        plant_type: plantType,
        completed_at: completed ? new Date().toISOString() : null
      }])
      .select()
      .single();

    if (error) throw error;

    // Award XP based on duration if completed
    let xpEarned = 0;
    if (completed) {
      if (durationMins >= 60) xpEarned = 150;
      else if (durationMins >= 45) xpEarned = 100;
      else if (durationMins >= 25) xpEarned = 50;

      if (xpEarned > 0) {
        await addXpBackend(userId, xpEarned);
      }
    }

    res.json({ success: true, session: data, xpEarned });
  } catch (err) {
    console.error("Error saving pomodoro session:", err);
    res.status(500).json({ error: err.message });
  }
};

// 6.6 Get Forest-style Pomodoro Sessions
exports.getPomodoroSessions = async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  try {
    const { data, error } = await supabase
      .from("sai_pomodoro_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("completed", true)
      .order("completed_at", { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error("Error fetching pomodoro sessions:", err);
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
    const xpRes = await addXpBackend(userId, 25);
    res.json({ feedback, xpEarned: 25, ...xpRes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 10. TIMETABLE BUILDER CONTROLLERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
exports.generateTimetable = async (req, res) => {
  const { userId, subject, examDate, hoursPerDay } = req.body;
  if (!userId || !subject || !examDate || !hoursPerDay) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const systemPrompt = `You are SAI, a demanding study coach. Generate a day-by-day study schedule from today until the exam date (${examDate}) for the subject: "${subject}".
The user has these available study hours per day of the week: ${JSON.stringify(hoursPerDay)}.
Generate a structured, logical sequence of topics leading up to the exam.
CRITICAL: Respond ONLY with a raw JSON array. No markdown code blocks, no explanations.
The JSON array structure must be exactly:
[
  {
    "date": "YYYY-MM-DD",
    "dayOfWeek": "Monday",
    "topic": "Topic Name",
    "suggestedDurationMinutes": 120,
    "completed": false
  },
  ...
]`;

    const messages = [{ role: "user", content: `Generate a timetable for subject: ${subject} with exam date: ${examDate}` }];
    const aiText = await generateAiResponse("curious", messages, systemPrompt, "sai");
    
    if (!aiText) {
      return res.status(503).json({ error: "AI provider failed to generate schedule." });
    }

    let cleanedText = aiText.trim();
    cleanedText = cleanedText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    const firstBracket = cleanedText.indexOf('[');
    const lastBracket = cleanedText.lastIndexOf(']');
    if (firstBracket >= 0 && lastBracket >= 0) {
      cleanedText = cleanedText.substring(firstBracket, lastBracket + 1);
    }

    const schedule = JSON.parse(cleanedText);
    res.json({ schedule });
  } catch (err) {
    console.error("Timetable generation error:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.saveTimetable = async (req, res) => {
  const { userId, subject, examDate, schedule } = req.body;
  if (!userId || !subject || !examDate || !schedule) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const { data, error } = await supabase
      .from("sai_timetables")
      .insert([{ user_id: userId, subject, exam_date: examDate, schedule }])
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("Save timetable error:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.getTimetables = async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  try {
    const { data, error } = await supabase
      .from("sai_timetables")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error("Get timetables error:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.updateTimetableSchedule = async (req, res) => {
  const { userId, timetableId, schedule } = req.body;
  if (!userId || !timetableId || !schedule) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const { data, error } = await supabase
      .from("sai_timetables")
      .update({ schedule })
      .eq("id", timetableId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 11. MISSION BOARD CONTROLLERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
exports.listMissions = async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  try {
    const { data, error } = await supabase
      .from("sai_missions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createMission = async (req, res) => {
  const { userId, title, subject, xpReward, dueDate } = req.body;
  if (!userId || !title || !subject) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const { data, error } = await supabase
      .from("sai_missions")
      .insert([{
        user_id: userId,
        title,
        subject,
        xp_reward: xpReward || 50,
        due_date: dueDate || null
      }])
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.completeMission = async (req, res) => {
  const { userId, missionId } = req.body;
  if (!userId || !missionId) return res.status(400).json({ error: "Missing fields" });

  try {
    const { data: currentMission, error: fetchErr } = await supabase
      .from("sai_missions")
      .select("*")
      .eq("id", missionId)
      .eq("user_id", userId)
      .single();

    if (fetchErr) throw fetchErr;
    if (currentMission.status === 'completed') {
      return res.json(currentMission);
    }

    const { data, error: updateErr } = await supabase
      .from("sai_missions")
      .update({ status: 'completed' })
      .eq("id", missionId)
      .eq("user_id", userId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // Award XP
    const xpRes = await addXpBackend(userId, data.xp_reward || 50);
    res.json({ success: true, mission: data, xpEarned: data.xp_reward || 50, ...xpRes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.generateDailyMissions = async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: existingToday } = await supabase
      .from("sai_missions")
      .select("*")
      .eq("user_id", userId)
      .eq("auto_generated", true)
      .gte("created_at", todayStart.toISOString());

    if (existingToday && existingToday.length > 0) {
      return res.json(existingToday);
    }

    const { data: activeGoals } = await supabase
      .from("study_tasks")
      .select("task_name")
      .eq("user_id", userId)
      .eq("completed", false)
      .limit(5);

    const goalsStr = activeGoals && activeGoals.length > 0
      ? activeGoals.map(g => g.task_name).join(", ")
      : "general study progress";

    const systemPrompt = `You are SAI, a logical study planner. Based on the user's active goals: [${goalsStr}], generate exactly 3 daily missions for today.
Each mission must have a short, actionable title, a subject, and an XP reward (choose 25 for quick tasks, 50 for normal, 75 for challenging).
CRITICAL: Respond ONLY with a raw JSON array. No explanations, no markdown.
Structure:
[
  {
    "title": "Solve 5 calculus practice problems",
    "subject": "Math",
    "xp_reward": 50
  },
  ...
]`;

    const messages = [{ role: "user", content: "Generate 3 daily missions" }];
    const aiText = await generateAiResponse("curious", messages, systemPrompt, "sai");

    if (!aiText) {
      return res.status(503).json({ error: "AI failed to generate daily missions" });
    }

    let cleanedText = aiText.trim();
    cleanedText = cleanedText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    const firstBracket = cleanedText.indexOf('[');
    const lastBracket = cleanedText.lastIndexOf(']');
    if (firstBracket >= 0 && lastBracket >= 0) {
      cleanedText = cleanedText.substring(firstBracket, lastBracket + 1);
    }

    const missionsList = JSON.parse(cleanedText);

    const missionsPayload = missionsList.map(m => ({
      user_id: userId,
      title: m.title,
      subject: m.subject,
      xp_reward: m.xp_reward || 50,
      auto_generated: true,
      due_date: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from("sai_missions")
      .insert(missionsPayload)
      .select();

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error("Daily missions generation error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 12. SUBJECT MASTERY CONTROLLERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
exports.updateMastery = async (req, res) => {
  const { userId, subject, topic, confidence } = req.body;
  if (!userId || !subject || !topic || confidence === undefined) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const { data: existing } = await supabase
      .from("sai_subject_mastery")
      .select("*")
      .eq("user_id", userId)
      .eq("subject", subject)
      .eq("topic", topic)
      .maybeSingle();

    let data, error;
    if (existing) {
      const res = await supabase
        .from("sai_subject_mastery")
        .update({ confidence, last_studied: new Date().toISOString().split('T')[0] })
        .eq("id", existing.id)
        .select()
        .single();
      data = res.data;
      error = res.error;
    } else {
      const res = await supabase
        .from("sai_subject_mastery")
        .insert([{
          user_id: userId,
          subject,
          topic,
          confidence,
          last_studied: new Date().toISOString().split('T')[0]
        }])
        .select()
        .single();
      data = res.data;
      error = res.error;
    }

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.listMastery = async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  try {
    const { data, error } = await supabase
      .from("sai_subject_mastery")
      .select("*")
      .eq("user_id", userId)
      .order("last_studied", { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.suggestMasteryTopic = async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  try {
    const { data: masteryList, error } = await supabase
      .from("sai_subject_mastery")
      .select("*")
      .eq("user_id", userId);

    if (error) throw error;

    if (!masteryList || masteryList.length === 0) {
      return res.json({ suggestion: "No topics logged in your mastery tracker yet. Complete a Pomodoro session and rate your confidence to see daily coaching tips." });
    }

    const sorted = [...masteryList].sort((a, b) => {
      if (a.confidence !== b.confidence) return a.confidence - b.confidence;
      return new Date(a.last_studied) - new Date(b.last_studied);
    });

    const weakest = sorted[0];

    const systemPrompt = `You are SAI, a strict study coach. The user has a weak topic: "${weakest.topic}" in subject: "${weakest.subject}" (confidence: ${weakest.confidence}/5).
Write a very brief, direct study recommendation (exactly 1-2 sentences) on how they should approach reviewing this topic today. Be direct, coaching, and actionable.`;

    const messages = [{ role: "user", content: "Write a study tip" }];
    const aiText = await generateAiResponse("curious", messages, systemPrompt, "sai");

    res.json({
      weakestTopic: weakest,
      suggestion: aiText ? aiText.trim() : `You should review ${weakest.topic} in ${weakest.subject} today. Focus on active recall.`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 13. EXAM COUNTDOWN CONTROLLERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
exports.getCountdownComment = async (req, res) => {
  const { userId, timetableId } = req.body;
  if (!userId || !timetableId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const { data: timetable, error } = await supabase
      .from("sai_timetables")
      .select("*")
      .eq("id", timetableId)
      .eq("user_id", userId)
      .single();

    if (error) throw error;

    const examDate = new Date(timetable.exam_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const msDiff = examDate - today;
    const daysRemaining = Math.max(0, Math.ceil(msDiff / (1000 * 60 * 60 * 24)));

    const schedule = Array.isArray(timetable.schedule) ? timetable.schedule : [];
    const totalTopics = schedule.length;
    const completedTopics = schedule.filter(item => item.completed).length;

    const systemPrompt = `You are SAI, a strict and highly analytical study coach.
The user has an exam for subject: "${timetable.subject}" in exactly ${daysRemaining} days.
Their study plan has a total of ${totalTopics} topics. So far, they have completed ${completedTopics} of them.
Provide a concise, direct evaluation (1-2 sentences) of their pacing. Advise whether they are on track, or if they need to increase study hours to cover all topics in time. Be motivating but brutally honest.`;

    const messages = [{ role: "user", content: "Evaluate study pace" }];
    const aiText = await generateAiResponse("curious", messages, systemPrompt, "sai");

    res.json({
      daysRemaining,
      totalTopics,
      completedTopics,
      comment: aiText ? aiText.trim() : "Ensure you keep studying consistently to cover all topics before your exam."
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 14. RANK & DAILY CHALLENGE CONTROLLERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
exports.getRankUpMessage = async (req, res) => {
  const { userId, rank } = req.body;
  if (!userId || !rank) return res.status(400).json({ error: "Missing required fields" });
  try {
    const systemPrompt = `You are SAI, a demanding study coach. The user just reached the new rank: "${rank}". Write a short (2 sentences), hard-hitting, motivational message acknowledging their new rank. Be proud but remind them the journey isn't over.`;
    const messages = [{ role: "user", content: `I just ranked up to ${rank}` }];
    const aiText = await generateAiResponse("curious", messages, systemPrompt, "sai");
    res.json({ message: aiText || `Congratulations on reaching ${rank}. Now get back to work.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.generateDailyChallenge = async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "Missing userId" });
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Check if challenge already exists today
    const { data: existing } = await supabase
      .from("sai_challenges")
      .select("*")
      .eq("user_id", userId)
      .gte("created_at", todayStr)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      return res.json(existing);
    }

    // Fetch context
    const { data: missions } = await supabase.from("sai_missions").select("title, subject").eq("user_id", userId).eq("status", "pending").limit(5);
    const { data: timetables } = await supabase.from("sai_timetables").select("subject, exam_date").eq("user_id", userId).limit(3);

    let contextText = "";
    if (missions && missions.length > 0) contextText += `Missions: ${missions.map(m => m.title).join(', ')}. `;
    if (timetables && timetables.length > 0) contextText += `Exams: ${timetables.map(t => t.subject).join(', ')}. `;
    if (!contextText) contextText = "General academic improvement.";

    const systemPrompt = `You are SAI, an elite study coach. Based on this context: [${contextText}], generate 1 single, highly specific, brutal daily challenge for today. It should be a single actionable sentence. No markdown formatting, just the sentence.`;
    const messages = [{ role: "user", content: "Give me today's challenge." }];
    const challengeText = await generateAiResponse("curious", messages, systemPrompt, "sai");

    const { data, error } = await supabase
      .from("sai_challenges")
      .insert([{
        user_id: userId,
        challenge_text: challengeText || "Complete 2 hours of deep work focusing on your weakest subject.",
        xp_reward: 100,
        completed: false,
        created_at: todayStr
      }])
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.completeDailyChallenge = async (req, res) => {
  const { userId, challengeId } = req.body;
  if (!userId || !challengeId) return res.status(400).json({ error: "Missing fields" });
  try {
    const { data: challenge } = await supabase.from("sai_challenges").select("*").eq("id", challengeId).single();
    if (!challenge || challenge.completed) return res.json(challenge);

    const { data, error } = await supabase
      .from("sai_challenges")
      .update({ completed: true })
      .eq("id", challengeId)
      .select()
      .single();

    if (error) throw error;
    
    // 2x XP reward
    const xpRes = await addXpBackend(userId, data.xp_reward || 100);

    res.json({ success: true, challenge: data, xpEarned: data.xp_reward || 100, ...xpRes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
