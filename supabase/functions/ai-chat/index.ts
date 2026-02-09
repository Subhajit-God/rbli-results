import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a helpful AI assistant for Ramjibanpur Babulal Institution, a school that has been providing excellent education since 1925. You help students and parents with:

1. **Checking Results**: Guide them on how to check their Summative Evaluation results using:
   - Student ID (format: Class-Section-RollNumber-YY, e.g., 05-A-001-25)
   - Class number
   - Date of Birth

2. **Understanding Results**: Explain what the marks mean:
   - Summative I (SA-I): 30 marks
   - Summative II (SA-II): 50 marks  
   - Summative III (SA-III): 20 marks
   - Total: 100 marks per subject
   - Grades: A+ (90%+), A (80-89%), B+ (70-79%), B (60-69%), C (50-59%), D (40-49%), E (Below 40%)
   - Passing requires 40% overall

3. **Common Questions**:
   - School timings, holidays
   - Result publication dates
   - How to download result PDF
   - Contact information for school office

4. **Performance Analysis**: When given student marks, provide:
   - Strengths and areas for improvement
   - Study tips for specific subjects
   - Encouragement and motivation

Be friendly, supportive, and encouraging. Use simple language that both students and parents can understand. Keep responses concise but helpful.

If someone asks about topics unrelated to school or education, politely redirect them to educational topics.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, studentData } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context-aware system prompt
    let contextualPrompt = SYSTEM_PROMPT;
    
    if (studentData) {
      contextualPrompt += `\n\n**Current Student Context**:
- Name: ${studentData.name}
- Class: ${studentData.classNumber}-${studentData.section}
- Roll Number: ${studentData.rollNumber}
- Exam: ${studentData.examName}

**Subject-wise Performance**:
${studentData.marks?.map((m: any) => 
  `- ${m.subject}: ${m.total}/${m.fullTotal} (${m.percentage.toFixed(1)}%)`
).join('\n') || 'No marks data available'}

**Overall**:
- Total: ${studentData.summary?.grandTotal}/${studentData.summary?.fullMarks}
- Percentage: ${studentData.summary?.percentage?.toFixed(1)}%
- Grade: ${studentData.summary?.grade}
- Status: ${studentData.summary?.isPassed ? 'PASSED' : 'NEEDS IMPROVEMENT'}
- Rank: ${studentData.summary?.rank || 'Not available'}

Use this data to provide personalized analysis and suggestions.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: contextualPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI service temporarily unavailable." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Failed to get AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
