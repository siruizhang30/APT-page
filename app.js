"use strict";

(() => {
  // Numbers are transcribed from Table 1 of the supplied manuscript.
  // The reported averages are retained rather than recomputed from rounded scores.
  const models = [
    { id: "lens", name: "Lens", scores: {
      base: [0.702, 0.521, 29.06, 85.93, 0.480, 57.06],
      off:  [0.815, 0.518, 46.35, 87.60, 0.758, 68.61],
      on:   [0.859, 0.523, 50.73, 87.88, 0.795, 71.26],
    } },
    { id: "sd3", name: "SD3.5-Medium", scores: {
      base: [0.684, 0.408, 17.63, 83.67, 0.312, 48.34],
      off:  [0.722, 0.399, 27.64, 86.54, 0.534, 55.94],
      on:   [0.763, 0.404, 29.50, 86.50, 0.569, 57.92],
    } },
    { id: "flux", name: "FLUX.1 [dev]", scores: {
      base: [0.660, 0.388, 22.23, 82.54, 0.260, 47.11],
      off:  [0.721, 0.435, 29.47, 85.53, 0.310, 52.32],
      on:   [0.751, 0.459, 31.01, 85.75, 0.513, 57.81],
    } },
    { id: "longcat", name: "LongCat-Image", scores: {
      base: [0.727, 0.500, 28.60, 85.71, 0.426, 55.92],
      off:  [0.780, 0.503, 31.14, 87.80, 0.730, 64.05],
      on:   [0.832, 0.510, 34.43, 87.89, 0.821, 67.72],
    } },
  ];

  const metrics = {
    geneval: { index: 0, name: "GenEval", label: "Overall", max: 1, decimals: 3 },
    oneig: { index: 1, name: "OneIG-EN", label: "Average", max: 1, decimals: 3 },
    geneval2: { index: 2, name: "GenEval2", label: "Soft-TIFA (geometric mean)", max: 100, decimals: 2 },
    dpg: { index: 3, name: "DPG", label: "Overall", max: 100, decimals: 2 },
    cvtg: { index: 4, name: "CVTG-2K", label: "Word accuracy", max: 1, decimals: 3 },
    average: { index: 5, name: "Normalized average", label: "Average over five benchmarks", max: 100, decimals: 2 },
  };

  const settings = [
    { id: "base", label: "Base model", color: "base" },
    { id: "off", label: "Handcrafted RL", color: "handcrafted" },
    { id: "on", label: "APT", color: "apt" },
  ];

  const agents = [
    {
      kicker: "A broad foundation",
      title: "Define what good generation looks like.",
      description: "Starting from a user-specified scope—or a general-purpose evaluation harness—the agent builds a diverse taxonomy of scenarios, then generates prompts and task-specific evaluation rubrics. This evaluation set stays fixed throughout post-training.",
      output: "Output: a fixed evaluation set of prompt–rubric pairs.",
      outputExamples: [
        {
          prompt: "A single industrial desk lamp clamps to a wood workbench at golden hour, heavy cast-iron arm and scuffed green enamel shade with chipped paint revealing raw metal, side-lit to emphasize gritty texture, 85mm shallow depth photo with a stamped manufacturer's label visible on the shade reading 'ACME TOOLS - 1978'.",
          criteria: [
            ["OCR Alignment (Manufacturer Label)","Ensure the stamped label on the shade reads exactly 'ACME TOOLS - 1978' and is legible."],
            ["Object Count Consistency (Lamp)","Verify that exactly one industrial desk lamp is present."],
            ["Object Placement and Spatial Reasoning (Workbench Clamp)","Confirm the lamp is securely clamped to a wooden workbench."],
            ["Attribute Accuracy (Cast-Iron Arm)","Verify that the lamp has a heavy cast-iron arm matching the description."],
            ["Attribute Accuracy (Shade Condition)","Verify the shade is green enamel with visible scuffs and chipped paint revealing raw metal."],
            ["Attribute Accuracy (Lighting Conditions)","Ensure the scene shows golden hour side lighting that emphasizes the gritty texture."],
            ["Attribute Accuracy (Workbench Material)","Verify the workbench surface appears as wood."],
            ["Attribute Accuracy (Enamel Shade)","Verify that the shade has a scuffed green enamel finish with chipped paint revealing raw metal."],
            ["Object Placement and Spatial Reasoning (Clamp Position)","Verify that the lamp is properly clamped to the wood workbench."],
            ["Attribute Accuracy (Shade Color and Texture)","Verify the enamel shade is scuffed green with chipped paint revealing raw metal."],
          ],
        },
        {
          prompt: "Studio photograph of a single-digit wooden die showing the face with one black pip, warm honey oak grain and hand-carved edges, slightly worn varnish and tiny dents, soft directional light from the right, shallow depth of field on a cool gray marble surface, crisp realistic texture detail.",
          criteria: [
            ["Object Count Consistency","Verify that exactly one wooden die is present."],
            ["Object Placement and Spatial Reasoning (Surface)","Ensure the die is resting on a cool gray marble surface."],
            ["Object Placement and Spatial Reasoning (Face Orientation)","Ensure the face with one black pip is oriented toward the camera."],
            ["Attribute Accuracy (Pip Color)","Confirm that the visible pip is solid black and only one pip is present."],
            ["Attribute Accuracy (Wood Grain)","Check that the die exhibits a warm honey oak wood grain."],
            ["Attribute Accuracy (Wood Grain Color)","Verify that the die's wood has a warm honey oak grain hue."],
            ["Attribute Accuracy (Hand-carved Edges and Wear)","Verify that the edges appear hand-carved with slightly worn varnish and tiny dents."],
            ["Attribute Accuracy (Background Marble Surface)","Verify that the die rests on a cool gray marble surface with realistic texture detail."],
            ["Attribute Accuracy (Lighting and Depth of Field)","Verify that soft directional light from the right and a shallow depth of field are applied."],
            ["Attribute Accuracy (Texture Detail)","Verify that the image shows crisp, realistic texture detail of the die."],
          ],
        },
      ],
      visual: '<div class="agent-stat">2,609<span>prompt–rubric pairs</span></div><div class="taxonomy"><span>Human</span><span>Object</span><span>Animal</span><span>Plant</span><span>Scene</span><span>Food</span><span>Event</span><span>Fictional World</span><span>Text</span><span>UI &amp; Graphic Design</span></div><span class="visual-note">10 scenario categories · Up to 10 prompt-specific rubrics</span>',
    },
    {
      kicker: "Fresh feedback, every round",
      title: "Find what the current model struggles with.",
      description: "The Diagnosis Agent samples a batch from the fixed evaluation set, generates images with the current model, and uses a vision-language evaluator to score each prompt-specific rubric. The report records successes and failures at the criterion level.",
      output: "Output: prompts paired with binary rubric-level evaluation results.",
      outputExamples: [
        {
          prompt: "Golden-hour rooftop image of an analytics dashboard displayed on a portable monitor placed in the left foreground, city skyline blurred behind, visible headline text 'Growth Rate +7.4%' and colored trend lines, low-angle composition, warm rim light, realistic matte screen glare and metal stand textures.",
          reward: 0.7,
          criteria: [
            ["Object Placement and Spatial Reasoning (Monitor Position)",1],
            ["Object Count Consistency (Portable Monitor)",1],
            ["OCR Alignment (Headline Text)",0],
            ["Attribute Accuracy (Colored Trend Lines)",1],
            ["Attribute Accuracy (Screen Glare)",1],
            ["Attribute Accuracy (Metal Stand Textures)",1],
            ["Attribute Accuracy (Lighting Conditions)",1],
            ["Attribute Accuracy (Warm Rim Light)",1],
            ["Attribute Accuracy (Screen and Stand Textures)",0],
            ["Attribute Accuracy (Trend Lines)",1],
          ],
        },
        {
          prompt: "Two cream-colored puppies sit side by side on a brushed steel exam table while a veterinarian in blue gloves steadies them with one hand and lifts a stethoscope with the other. Cool fluorescent light, fine fur fluff, green collar tags jingling, reflections glinting from the gray instrument tray nearby.",
          reward: 0.6,
          criteria: [
            ["Object Count Consistency",1],
            ["Object Placement and Spatial Reasoning",1],
            ["Action Accuracy",0],
            ["Attribute Accuracy (Puppy Fur Color and Texture)",1],
            ["Attribute Accuracy (Glove Color)",1],
            ["Attribute Accuracy (Collar Tags)",0],
            ["Attribute Accuracy (Exam Table Material)",0],
            ["Object Count Consistency (Cream-Colored Puppies)",1],
            ["Attribute Accuracy (Puppy Color)",1],
            ["Attribute Accuracy (Green Collar Tags)",0],
          ],
        },
      ],
      visual: '<div class="agent-stat">120<span>diagnostic prompts per round</span></div><div class="rubric-preview"><span>Prompt-specific rubric <b>0 or 1</b></span><span>Evaluator <b>GPT-4.1-mini</b></span></div><span class="visual-note">The diagnostic report is regenerated after each model update.</span>',
    },
    {
      kicker: "An evolving curriculum",
      title: "Train on what the model needs next.",
      description: "The RL Data Generation Agent analyzes recurring failure patterns and creates new, model-specific training prompts. A clear majority target weak capabilities, with a smaller share covering moderate and mastered capabilities. RL updates the model, which is then diagnosed again.",
      output: "Output: new training prompts and rubrics for the next RL update.",
      outputExamples: [
        {
          prompt: "Inside a snowy barn doorway, tightly packed sheep crowd around a single red mineral block, breath steaming in the cold air, curly fleece sparkling with tiny ice crystals; at the right post leans a burlap sack printed 'WINTER FEED - BARLEY #3' and a rectangular placard reading 'NO SMOKING'.",
          criteria: [
            ["Object Count Consistency","Verify that multiple sheep are present and tightly packed as described."],
            ["Action Accuracy","Verify that the sheep are crowding around a single red mineral block."],
            ["Attribute Accuracy (Sheep Fleece)","Verify that the sheep have curly fleece sparkling with tiny ice crystals."],
            ["Attribute Accuracy (Breath Steam)","Verify that the breath of the sheep is visible as steam in the cold air."],
            ["Attribute Accuracy (Red Mineral Block)","Verify that there is a single red mineral block present."],
            ["Attribute Accuracy (Burlap Sack Text)","Verify that the burlap sack at the right post is printed with 'WINTER FEED - BARLEY #3'."],
            ["Attribute Accuracy (Placard Text)","Verify that the rectangular placard reads 'NO SMOKING'."],
            ["Object Placement and Spatial Reasoning","Verify that the burlap sack is leaning against the right post of the barn doorway."],
            ["Style and Prompt Consistency","Verify that the image captures the cold, snowy barn scene with accurate environmental details and lighting."],
            ["Aesthetic Quality","Verify that the image is clear and detailed, conveying the texture of fleece, ice crystals, and snow realistically."],
          ],
        },
        {
          prompt: "Museum gallery photograph of a preserved equine mane mounted inside a glass case, brittle strands ranging from ash gray to deep brown under a clinical spotlight; a plaque in the foreground reads 'Equine Mane, 19th Century', neutral walls behind, visitors softly blurred in the distance.",
          criteria: [
            ["Attribute Accuracy (Equine Mane Colors)","Verify that the mane strands show a range of colors from ash gray to deep brown with a brittle texture as described."],
            ["Object Placement and Spatial Reasoning (Mane and Glass Case)","Verify that the preserved mane is properly mounted inside a glass case visible in the image."],
            ["OCR Alignment (Plaque Text)","Verify that the plaque in the foreground clearly reads 'Equine Mane, 19th Century' as specified by the prompt."],
            ["Style and Prompt Consistency (Photograph)","Verify that the image appears as a photograph of a museum gallery with clinical lighting and neutral walls, avoiding artistic or abstract styles."],
            ["Object Count Consistency (Visitors)","Verify that visitors in the background appear softly blurred and few in number, reflecting the prompt's distant and subtle presence description."],
            ["Aesthetic Quality","Verify that the image is sharp and clear with realistic lighting, appropriate depth of field, and minimal visual artifacts consistent with a professional museum photograph."],
          ],
        },
      ],
      visual: '<div class="agent-stat">480<span>new training prompts per round</span></div><div class="sampling-priorities"><span>Underperforming capabilities <b>Prioritize</b></span><span>Moderate capabilities <b>Retain</b></span><span>Mastered capabilities <b>Retain</b></span></div><span class="visual-note">20 optimization steps per round · Model-specific data, continuously refreshed</span>',
    },
  ];

  // Each prompt below is taken from the corresponding qualitative figure.
  // base = original model; off = handcrafted RL; on = APT.
  const examples = {
    lens: [
      { id: "dpg_midjourney16", title: "Mona Lisa, reimagined", category: "Creative composition", figure: 3,
        prompt: "A digitally rendered image of the iconic Monalisa capturing a selfie, boasting 8K resolution and hyper-realistic details that highlight the delicate textures of her skin and the intricate fibers of her clothing. The scene is illuminated with cinematic lighting that casts soft shadows and enhances the depth of field, giving a three-dimensional quality to the image. The background is blurred artfully, drawing full attention to her enigmatic expression and the modern device in her hands, all created with the precision of an Octane render engine." },
      { id: "geneval2_202", title: "Five penguins", category: "Counting & spatial relations", figure: 3,
        prompt: "five penguins to the left of a striped violin" },
      { id: "text_093", title: "A wedding welcome", category: "Text rendering", figure: 3,
        prompt: 'Craft a chalkboard sign that reads with design elements, showing "Welcome to Emma & Jack\'s Wedding" with elegant cursive fonts, banners, and floral hand-drawn elements. The vintage blackboard rests at the garden entrance, surrounded by flowers and wooden décor.' },
      { id: "geneval_00360", title: "Bird & skateboard", category: "Spatial relations", figure: 3,
        prompt: "a photo of a bird below a skateboard" },
      { id: "dpg_diffusiondb20", title: "A cat in the cosmos", category: "Compositional prompt following", figure: 4,
        prompt: "The image captures a whimsical scene with a brown tabby cat, its fur patterned in shades of dark brown, black, and light taupe. The cat, situated as if in the throes of space, is portrayed with a transparent, gleaming bubble encasing its head like an astronaut's helmet. Around it, an assortment of smaller bubbles float serenely in the imagined cosmos, with a creatively interpreted Saturn adorned with rings in the backdrop, providing an aura of interstellar exploration." },
      { id: "geneval_00271", title: "A purple elephant", category: "Attribute binding", figure: 4,
        prompt: "a photo of a purple elephant" },
      { id: "text_189", title: "No limits, no rules", category: "Text rendering", figure: 4,
        prompt: 'Try crafting a bold street art design spelling "No Limits, No Rules — Just Pure Expression" using thick outlines, vivid spray textures, and abstract shapes on a metal garage door.' },
      { id: "dpg_102", title: "Two butterflies", category: "Counting & composition", figure: 4,
        prompt: "Two multicolored butterflies with delicate, veined wings gently balance atop a vibrant, orange tangerine in a bustling garden. The tangerine, with its glossy, dimpled texture, is situated on a wooden table, contrasting with the greenery of the surrounding foliage and flowers. The butterflies, appearing nearly small in comparison, add a touch of grace to the scene, complementing the natural colors of the verdant backdrop." },
    ],
    sd3: [
      { id: "dpg_diffusiondb33", title: "Neon city", category: "Style & dense prompt following", figure: 5,
        prompt: "a highly intricate and vibrant cityscape that reflects a fusion of Moebius's imaginative design and Makoto Shinkai's detailed animation style. The streets are aglow with neon signs in a kaleidoscope of colors, casting reflections on the glossy, rain-slicked pavements. Towering skyscrapers with glowing windows rise towards a starless night sky, as the artwork garners significant attention and praise on ArtStation.." },
      { id: "geneval2_229", title: "Cookies & a bagel", category: "Counting, attributes & spatial relations", figure: 5,
        prompt: "four plastic cookies in front of a bagel" },
      { id: "text_093", title: "A wedding welcome", category: "Text rendering", figure: 5,
        prompt: 'Craft a chalkboard sign that reads with design elements, showing "Welcome to Emma & Jack\'s Wedding" with elegant cursive fonts, banners, and floral hand-drawn elements. The vintage blackboard rests at the garden entrance, surrounded by flowers and wooden décor.' },
      { id: "gen_041", title: "A warm-hearted gecko", category: "Design & prompt following", figure: 5,
        prompt: "Design a heartwarming t-shirt for gecko lovers, centered on a charming gecko hugging a glowing heart. Emphasize the gecko's gentle expression, highlighting the 'warm heart' theme. It should feature five fingers and vibrant, soothing colors to showcase its unique texture and patterns. Keep the background minimalistic, ensuring the focus remains on the gecko and a playful, easy-to-read slogan. Strive for a blend of cuteness and sophistication to attract a wide audience of gecko enthusiasts." },
    ],
    flux: [
      { id: "gen_003", title: "A little star’s journey", category: "Creative composition & prompt following", figure: 6,
        prompt: "A magical journey unfolds in a cosmic landscape, where a luminous little star embarks on an adventure. Radiating a gentle glow and surrounded by a tapestry of twinkling stars, the scene focuses on warm, golden tones to highlight the celestial body's curious and lively nature. The scene includes a small, distinct scarf and a backpack, elements that harken to explorations and whimsical travels. Washes of light hues from distant nebulae create an ethereal, mesmerizing quality, casting vibrant shades across the star's surface. The soft-focus background enhances the mystical feel of the universe, weaving a narrative of awe and discovery. Positioned as if ready to leap into the unknown, the celestial traveler contemplates its journey ahead against a canvas of fading light, suggesting steadfast resolve amidst challenges. Ethereal materials reflect ambient light, delivering an almost tangible sense of warmth and adventure. The entire image captivates with depth, light play, and dynamic composition, inviting viewers to ponder the mysteries of space and journeys beyond the horizon." },
      { id: "geneval_00183", title: "Three sports balls", category: "Object counting", figure: 6,
        prompt: "a photo of three sports balls" },
      { id: "text_191", title: "Hope rising", category: "Text rendering", figure: 6,
        prompt: 'You can illustrate "Hope Rising" with soft pastel sprays mixed with sharp black lines, appearing on a cracked, abandoned building facade.' },
      { id: "geneval_00373", title: "Cake & baseball bat", category: "Spatial relations", figure: 6,
        prompt: "a photo of a cake below a baseball bat" },
    ],
    longcat: [
      { id: "dpg_partiprompts55", title: "Milk in motion", category: "Physical interaction & prompt following", figure: 7,
        prompt: "A stream of white milk flowing gracefully from a clear glass pitcher into a deep blue ceramic bowl. The bowl is sitting on a marble countertop, surrounded by a scattering of fresh strawberries and a box of cereal. Sunlight filters through a nearby window, casting a warm glow on the scene and highlighting the smooth texture of the milk's surface." },
      { id: "text_158", title: "Stories to life", category: "Text rendering & graphic design", figure: 7,
        prompt: 'Introduce a playful business card design for a children\'s book illustrator, using pastel colors. Show "Sophie Wu", "Illustrator", a tagline "Bringing Stories to Life", and contact info "sophie.art@gmail.com".' },
      { id: "text_042", title: "Food carnival", category: "Text rendering & scene composition", figure: 7,
        prompt: 'Create a poster with the words "Food Carnival: Skewer Street Feast", depicting a cheerful vendor grilling skewers along a vibrant food street.' },
    ],
  };

  const $ = (selector) => document.querySelector(selector);
  let selectedModel = "lens";
  let selectedExample = 0;
  let toastTimeout;
  let lastLightboxTrigger;

  function configureLinks() {
    const config = window.APT_CONFIG || {};
    const paperLinks = document.querySelectorAll("[data-paper-link]");
    paperLinks.forEach((link) => {
      link.hidden = link.id !== "paper-link";
      link.removeAttribute("href");
      link.setAttribute("aria-disabled", "true");
    });
    if (config.arxivPdfUrl) {
      const url = new URL(config.arxivPdfUrl, document.baseURI);
      if (["https:", "http:"].includes(url.protocol)) {
        paperLinks.forEach((link) => {
          link.href = url.href;
          if (link.dataset.paperPage) link.hash = `page=${link.dataset.paperPage}`;
          link.removeAttribute("aria-disabled");
          link.hidden = false;
        });
      }
    }
    for (const [key, id] of [["codeUrl", "code-link"], ["arxivUrl", "arxiv-link"]]) {
      const link = document.getElementById(id);
      link.hidden = key !== "arxivUrl";
      link.removeAttribute("href");
      link.setAttribute("aria-disabled", "true");
      if (key === "codeUrl") $("#code-pending").hidden = false;
      if (!config[key]) continue;
      const url = new URL(config[key], document.baseURI);
      if (!["https:", "http:"].includes(url.protocol)) continue;
      link.href = url.href;
      link.removeAttribute("aria-disabled");
      link.hidden = false;
      if (key === "codeUrl") $("#code-pending").hidden = true;
    }
  }

  function renderChart(key) {
    const metric = metrics[key];
    const fragment = document.createDocumentFragment();
    models.forEach((model) => {
      const group = document.createElement("div");
      group.className = "chart-group";
      const difference = model.scores.on[metric.index] - model.scores.base[metric.index];
      const gain = `${difference >= 0 ? "+" : "−"}${Math.abs(difference).toFixed(metric.decimals)}`;
      const modelLabel = document.createElement("div");
      modelLabel.className = "chart-model";
      modelLabel.textContent = model.name;
      const gainLabel = document.createElement("span");
      gainLabel.className = "chart-gain";
      gainLabel.textContent = `${gain} vs. base`;
      modelLabel.append(gainLabel);
      group.append(modelLabel);
      const bars = document.createElement("div");
      bars.className = "chart-bars";
      settings.forEach((setting) => {
        const value = model.scores[setting.id][metric.index];
        const row = document.createElement("div");
        row.className = "chart-bar-row";
        row.style.setProperty("--bar-width", `${value / metric.max * 100}%`);
        row.setAttribute("aria-label", `${model.name}, ${setting.label}: ${value.toFixed(metric.decimals)}`);
        const bar = document.createElement("span");
        bar.className = `chart-bar ${setting.color}`;
        bar.setAttribute("aria-hidden", "true");
        const label = document.createElement("span");
        label.className = "chart-value";
        label.textContent = value.toFixed(metric.decimals);
        label.setAttribute("aria-hidden", "true");
        row.append(bar, label);
        bars.append(row);
      });
      group.append(bars);
      fragment.append(group);
    });
    $("#benchmark-chart").replaceChildren(fragment);
    $("#benchmark-chart").setAttribute("aria-label", `${metric.name}: base model, handcrafted RL, and APT results for four models`);
    $("#chart-description").textContent = `${key === "average" ? metric.label : `${metric.name} · ${metric.label}`} · Higher is better ↑`;
    $("#chart-axis").replaceChildren(...[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
      const tick = document.createElement("span");
      tick.textContent = metric.max === 1 ? (fraction * metric.max).toFixed(2) : String(fraction * metric.max);
      return tick;
    }));
    $("#chart-note").textContent = key === "average"
      ? "For the normalized average, GenEval, OneIG-EN, and CVTG-2K are rescaled to 0–100, then averaged with GenEval2 and DPG. No benchmark prompts are used to construct the main APT training data."
      : `${metric.name} scores are shown in their original 0–${metric.max} units. Gains beside model names compare APT with the base model; improvements vary by benchmark. No benchmark prompts are used to construct the main APT training data.`;
  }

  function renderResultsTable() {
    const fragment = document.createDocumentFragment();
    const columnMetrics = [metrics.geneval, metrics.oneig, metrics.geneval2, metrics.dpg, metrics.cvtg, metrics.average];
    models.forEach((model) => settings.forEach((setting, index) => {
      const row = document.createElement("tr");
      row.className = setting.id === "on" ? "apt-row" : index === 0 ? "model-start" : "";
      const modelCell = document.createElement("th");
      modelCell.scope = "row";
      modelCell.textContent = model.name;
      const settingCell = document.createElement("td");
      settingCell.textContent = setting.label;
      row.append(modelCell, settingCell);
      columnMetrics.forEach((metric) => {
        const cell = document.createElement("td");
        const value = model.scores[setting.id][metric.index].toFixed(metric.decimals);
        if (setting.id === "on" && metric === metrics.average) {
          const strong = document.createElement("strong");
          strong.textContent = value;
          cell.append(strong);
        } else {
          cell.textContent = value;
        }
        row.append(cell);
      });
      fragment.append(row);
    }));
    $("#results-table-body").append(fragment);
  }

  function selectAgent(index) {
    const agent = agents[index];
    document.querySelectorAll("[data-agent]").forEach((tab) => {
      const active = Number(tab.dataset.agent) === index;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    $("#agent-panel").setAttribute("aria-labelledby", `agent-tab-${index}`);
    $("#agent-kicker").textContent = agent.kicker;
    $("#agent-title").textContent = agent.title;
    $("#agent-description").textContent = agent.description;
    $("#agent-output").textContent = agent.output;
    $("#agent-visual").innerHTML = agent.visual;
    renderAgentExamples(agent);
  }

  function renderAgentExamples(agent) {
    const outputExamples = agent.outputExamples || [];
    const details = $("#agent-examples");
    const content = $("#agent-examples-content");
    const count = $("#agent-examples-count");
    details.open = false;
    details.hidden = outputExamples.length === 0;
    content.replaceChildren();
    count.textContent = "";
    if (!outputExamples.length) return;

    const hasScores = outputExamples.some((example) => typeof example.reward === "number");
    count.textContent = `${outputExamples.length} ${hasScores ? "evaluated prompts" : "prompt–rubric pairs"}`;
    const element = (tag, className, text) => {
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (text !== undefined) node.textContent = text;
      return node;
    };
    const fragment = document.createDocumentFragment();
    if (hasScores) {
      fragment.append(element("p", "agent-examples-legend", "Binary rubric results: 1 = satisfied · 0 = not satisfied."));
    }
    outputExamples.forEach((example, index) => {
      const scored = typeof example.reward === "number";
      const card = element("article", "agent-example-card");
      const heading = element("header", "agent-example-heading");
      heading.append(element("h4", "", `${scored ? "Prompt" : "Example"} ${index + 1}`));
      if (scored) {
        heading.append(element("span", "agent-example-reward", `Reward: ${example.reward.toFixed(4)}`));
      }
      const prompt = element("div", "agent-example-prompt");
      prompt.append(element("span", "agent-example-label", "Prompt"), element("p", "", example.prompt));
      const rubricHeading = element("h5", "agent-example-rubric-title", `${scored ? "Rubric-level results" : "Evaluation rubrics"} · ${example.criteria.length}`);
      const rubrics = element("dl", `agent-example-rubrics${scored ? " is-scored" : ""}`);
      example.criteria.forEach(([name, value]) => {
        const row = element("div", "");
        const result = element("dd", scored ? `rubric-score ${value === 1 ? "is-pass" : "is-fail"}` : "", String(value));
        if (scored) result.setAttribute("aria-label", `${value}: ${value === 1 ? "satisfied" : "not satisfied"}`);
        row.append(element("dt", "", name), result);
        rubrics.append(row);
      });
      card.append(heading, prompt, rubricHeading, rubrics);
      fragment.append(card);
    });
    content.append(fragment);
  }

  function imagePath(model, id, variant) {
    return `assets/images/${model}-${id}_${variant}.jpg`;
  }

  function renderExamplePicker() {
    const fragment = document.createDocumentFragment();
    examples[selectedModel].forEach((example, index) => {
      const button = document.createElement("button");
      button.className = "example-button";
      button.type = "button";
      button.dataset.example = String(index);
      button.setAttribute("aria-pressed", "false");
      const img = document.createElement("img");
      img.src = imagePath(selectedModel, example.id, "thumb");
      img.width = 96;
      img.height = 96;
      img.alt = "";
      img.loading = "lazy";
      const title = document.createElement("span");
      title.textContent = example.title;
      button.append(img, title);
      fragment.append(button);
    });
    $("#example-picker").replaceChildren(fragment);
  }

  function renderExample() {
    const example = examples[selectedModel][selectedExample];
    const model = models.find((item) => item.id === selectedModel);
    settings.forEach((setting) => {
      const img = document.getElementById(`image-${setting.id}`);
      const path = imagePath(selectedModel, example.id, setting.id);
      img.src = path;
      img.alt = `${example.title} — ${model.name}, ${setting.label}.`;
      const button = document.getElementById(`compare-${setting.id}`);
      button.dataset.lightbox = path;
      button.dataset.lightboxTitle = `${model.name} · ${setting.label} · ${example.title}`;
      button.setAttribute("aria-label", `Enlarge ${img.alt}`);
    });
    $("#gallery-prompt").textContent = example.prompt;
    $("#gallery-category").textContent = example.category;
    $("#gallery-source").textContent = `Paper · Figure ${example.figure}`;
    $("#example-counter").textContent = `${String(selectedExample + 1).padStart(2, "0")} / ${String(examples[selectedModel].length).padStart(2, "0")}`;
    document.querySelectorAll("[data-example]").forEach((button) => {
      const active = Number(button.dataset.example) === selectedExample;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function selectModel(id, exampleId) {
    if (!examples[id]) return;
    selectedModel = id;
    selectedExample = exampleId ? Math.max(0, examples[id].findIndex((example) => example.id === exampleId)) : 0;
    document.querySelectorAll("[data-model]").forEach((button) => {
      const active = button.dataset.model === id;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
    });
    $("#gallery-panel").setAttribute("aria-labelledby", `gallery-tab-${id}`);
    renderExamplePicker();
    renderExample();
  }

  function stepExample(direction) {
    const count = examples[selectedModel].length;
    selectedExample = (selectedExample + direction + count) % count;
    renderExample();
    // Scroll only the thumbnail strip; never move the page during comparison.
    const activeButton = $(".example-button.is-active");
    const strip = $("#example-picker");
    strip.scrollTo({ left: activeButton.offsetLeft - strip.offsetLeft - strip.clientWidth / 2 + activeButton.clientWidth / 2, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }

  function makeTabsKeyboardAccessible() {
    document.querySelectorAll('[role="tablist"]').forEach((tablist) => {
      tablist.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        const tabs = [...tablist.querySelectorAll('[role="tab"]')];
        const index = tabs.indexOf(document.activeElement);
        if (index < 0) return;
        event.preventDefault();
        let next = index;
        if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
        if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
        if (event.key === "Home") next = 0;
        if (event.key === "End") next = tabs.length - 1;
        tabs[next].focus();
        tabs[next].click();
      });
    });
  }

  function showToast(message) {
    const toast = $("#toast");
    clearTimeout(toastTimeout);
    toast.textContent = message;
    toast.classList.add("is-visible");
    toastTimeout = setTimeout(() => toast.classList.remove("is-visible"), 3500);
  }

  function copyFallback(text) {
    const field = document.createElement("textarea");
    field.value = text;
    field.style.position = "fixed";
    field.style.opacity = "0";
    field.setAttribute("aria-label", "Citation to copy");
    document.body.append(field);
    field.select();
    let copied = false;
    try { copied = document.execCommand("copy"); } catch (_) { /* Select the visible citation below if copying is unavailable. */ }
    field.remove();
    $("#copy-citation").focus({ preventScroll: true });
    return copied;
  }

  async function copyCitation() {
    const text = $("#bibtex").textContent.trim();
    let copied = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        copied = true;
      }
    } catch (_) { /* file:// and denied permissions use the fallback. */ }
    if (!copied) copied = copyFallback(text);
    if (copied) {
      showToast("Citation copied to clipboard.");
      $("#copy-citation span").textContent = "Copied!";
      setTimeout(() => { $("#copy-citation span").textContent = "Copy citation"; }, 2500);
    } else {
      const range = document.createRange();
      range.selectNodeContents($("#bibtex"));
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      showToast("Citation selected. Press ⌘C or Ctrl+C to copy.");
    }
  }

  function openLightbox(trigger) {
    const dialog = $("#lightbox");
    lastLightboxTrigger = trigger;
    $("#lightbox-image").src = trigger.dataset.lightbox;
    $("#lightbox-image").alt = trigger.dataset.lightboxTitle;
    $("#lightbox-title").textContent = trigger.dataset.lightboxTitle;
    dialog.showModal();
    document.body.classList.add("modal-open");
    $("#close-lightbox").focus({ preventScroll: true });
  }

  function initializeLightbox() {
    const dialog = $("#lightbox");
    $("#close-lightbox").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
    dialog.addEventListener("close", () => {
      document.body.classList.remove("modal-open");
      lastLightboxTrigger?.focus({ preventScroll: true });
    });
  }

  function initializeNavigation() {
    if (!("IntersectionObserver" in window)) return;
    const links = [...document.querySelectorAll(".nav-links a")];
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((link) => {
          const active = link.hash === `#${entry.target.id}`;
          link.classList.toggle("is-active", active);
          if (active) link.setAttribute("aria-current", "location");
          else link.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-15% 0px -70% 0px", threshold: 0 });
    links.forEach((link) => { const section = document.querySelector(link.hash); if (section) observer.observe(section); });
    // Clear the section highlight when the reader returns to the paper header.
    const hero = document.querySelector(".hero");
    if (hero) observer.observe(hero);
  }

  $("#metric-select").addEventListener("change", (event) => renderChart(event.target.value));
  $("#previous-example").addEventListener("click", () => stepExample(-1));
  $("#next-example").addEventListener("click", () => stepExample(1));
  $("#copy-citation").addEventListener("click", copyCitation);
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("button, a");
    if (!trigger) return;
    if (trigger.hasAttribute("data-agent")) selectAgent(Number(trigger.dataset.agent));
    if (trigger.hasAttribute("data-model")) selectModel(trigger.dataset.model);
    if (trigger.hasAttribute("data-example")) { selectedExample = Number(trigger.dataset.example); renderExample(); }
    if (trigger.hasAttribute("data-gallery-model")) selectModel(trigger.dataset.galleryModel, trigger.dataset.galleryId);
    if (trigger.hasAttribute("data-lightbox")) openLightbox(trigger);
  });

  configureLinks();
  renderAgentExamples(agents[0]);
  renderChart("average");
  renderResultsTable();
  renderExamplePicker();
  renderExample();
  makeTabsKeyboardAccessible();
  initializeLightbox();
  initializeNavigation();
})();
