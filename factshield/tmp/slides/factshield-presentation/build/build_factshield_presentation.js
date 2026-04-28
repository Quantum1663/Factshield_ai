const fs = await import("node:fs/promises");
const path = await import("node:path");
const { Presentation, PresentationFile } = await import("@oai/artifact-tool");

const W = 1280;
const H = 720;
const DECK_ID = "factshield-presentation";
const ROOT = "C:\\Users\\ansar\\PycharmProjects\\Majorproject_2.0\\factshield";
const OUT_DIR = path.join(ROOT, "presentation-output", "factshield-presentation", "outputs");
const SCRATCH_DIR = path.join(ROOT, "tmp", "slides", DECK_ID);
const PREVIEW_DIR = path.join(SCRATCH_DIR, "preview");
const INSPECT_PATH = path.join(SCRATCH_DIR, "inspect.ndjson");
const SCREEN_DESKTOP = path.join(ROOT, "frontend-v3", "verification-desktop.png");
const SCREEN_MOBILE = path.join(ROOT, "frontend-v3", "verification-mobile.png");

const BG = "#07121F";
const BG_2 = "#0B1B2C";
const PANEL = "#102437";
const PANEL_2 = "#14304A";
const PANEL_3 = "#183A58";
const STROKE = "#275773";
const TEXT = "#F4FAFF";
const TEXT_SOFT = "#B1CBDA";
const TEXT_MUTED = "#7AA1B7";
const CYAN = "#1FD3F3";
const TEAL = "#1AD1A5";
const GOLD = "#F0C86B";
const RED = "#FF7E87";
const WHITE = "#FFFFFF";
const TRANSPARENT = "#00000000";
const TITLE_FACE = "Poppins";
const BODY_FACE = "Lato";
const MONO_FACE = "Aptos Mono";

const inspectRecords = [];

const SOURCES = {
  architecture: "Local architecture document and implemented backend pipeline.",
  product: "Current FactShield frontend with command center, reports, team, settings, and export workflow.",
  scenarios: "Live scenario tests run on April 28, 2026 before the presentation.",
};

async function ensureDirs() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.mkdir(PREVIEW_DIR, { recursive: true });
}

async function readImageBlob(imagePath) {
  const bytes = await fs.readFile(imagePath);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

async function saveBlobToFile(blob, filePath) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  await fs.writeFile(filePath, bytes);
}

function record(kind, payload) {
  inspectRecords.push({ kind, ...payload });
}

function addShape(slide, geometry, left, top, width, height, fill, lineFill = TRANSPARENT, lineWidth = 0, meta = {}) {
  const shape = slide.shapes.add({
    geometry,
    position: { left, top, width, height },
    fill,
    line: { style: "solid", fill: lineFill, width: lineWidth },
  });
  if (meta.role) {
    record("shape", { slide: meta.slide, role: meta.role, bbox: [left, top, width, height] });
  }
  return shape;
}

function addText(
  slide,
  slideNo,
  text,
  left,
  top,
  width,
  height,
  {
    size = 20,
    color = TEXT,
    bold = false,
    face = BODY_FACE,
    fill = TRANSPARENT,
    lineFill = TRANSPARENT,
    lineWidth = 0,
    align = "left",
    valign = "top",
    role = "text",
  } = {},
) {
  const box = addShape(slide, "rect", left, top, width, height, fill, lineFill, lineWidth, { slide: slideNo, role });
  box.text = text;
  box.text.fontSize = size;
  box.text.color = color;
  box.text.bold = bold;
  box.text.typeface = face;
  box.text.alignment = align;
  box.text.verticalAlignment = valign;
  box.text.autoFit = "shrinkText";
  box.text.insets = { left: 0, right: 0, top: 0, bottom: 0 };
  record("textbox", { slide: slideNo, role, text: String(text), bbox: [left, top, width, height] });
  return box;
}

async function addImage(slide, slideNo, imagePath, left, top, width, height, fit = "cover", geometry = "rect", role = "image") {
  const image = slide.images.add({
    blob: await readImageBlob(imagePath),
    fit,
    alt: role,
    geometry,
  });
  image.position = { left, top, width, height };
  record("image", { slide: slideNo, role, path: imagePath, bbox: [left, top, width, height] });
  return image;
}

function addBackground(slide, slideNo) {
  slide.background.fill = BG;
  addShape(slide, "rect", 0, 0, W, H, BG_2, TRANSPARENT, 0, { slide: slideNo, role: "background" });
  addShape(slide, "rect", 0, 0, W, 106, "#0B243A", TRANSPARENT, 0, { slide: slideNo, role: "top strip" });
  addShape(slide, "ellipse", 948, -132, 410, 410, "#103B6044", TRANSPARENT, 0, { slide: slideNo, role: "glow right" });
  addShape(slide, "ellipse", -118, 472, 360, 360, "#0C4E6730", TRANSPARENT, 0, { slide: slideNo, role: "glow left" });
  addShape(slide, "rect", 0, 670, W, 50, "#050E18", TRANSPARENT, 0, { slide: slideNo, role: "footer band" });
}

function addHeader(slide, slideNo, section, page, total) {
  addText(slide, slideNo, section.toUpperCase(), 64, 38, 220, 20, {
    size: 13,
    color: CYAN,
    bold: true,
    face: MONO_FACE,
    role: "section",
  });
  addText(slide, slideNo, `${String(page).padStart(2, "0")} / ${String(total).padStart(2, "0")}`, 1090, 38, 120, 20, {
    size: 13,
    color: TEXT_MUTED,
    bold: true,
    face: MONO_FACE,
    align: "right",
    role: "page",
  });
  addShape(slide, "rect", 64, 64, 1152, 2, STROKE, TRANSPARENT, 0, { slide: slideNo, role: "header rule" });
}

function addTitle(slide, slideNo, title, subtitle, width = 760) {
  addText(slide, slideNo, title, 64, 88, width, 104, {
    size: 34,
    color: TEXT,
    bold: true,
    face: TITLE_FACE,
    role: "title",
  });
  if (subtitle) {
    addText(slide, slideNo, subtitle, 66, 188, Math.min(780, width), 58, {
      size: 17,
      color: TEXT_SOFT,
      face: BODY_FACE,
      role: "subtitle",
    });
  }
}

function addFooter(slide, slideNo, leftText, rightText) {
  addText(slide, slideNo, leftText, 64, 683, 780, 16, {
    size: 11,
    color: TEXT_MUTED,
    face: BODY_FACE,
    role: "footer left",
  });
  addText(slide, slideNo, rightText, 940, 683, 270, 16, {
    size: 11,
    color: TEXT_MUTED,
    face: BODY_FACE,
    align: "right",
    role: "footer right",
  });
}

function addNotes(slide, text, sourceKeys) {
  const sources = sourceKeys.map((key) => `- ${SOURCES[key] || key}`).join("\n");
  slide.speakerNotes.setText(`${text}\n\n[Sources]\n${sources}`);
}

function addPill(slide, slideNo, left, top, width, text, fill = "#0F3951", textColor = CYAN) {
  addShape(slide, "roundRect", left, top, width, 30, fill, STROKE, 1, { slide: slideNo, role: `pill ${text}` });
  addText(slide, slideNo, text, left + 14, top + 7, width - 28, 15, {
    size: 12,
    color: textColor,
    bold: true,
    face: MONO_FACE,
    role: `pill text ${text}`,
  });
}

function addMetric(slide, slideNo, left, top, width, height, value, label, accent) {
  addShape(slide, "roundRect", left, top, width, height, PANEL, STROKE, 1.2, { slide: slideNo, role: `metric ${label}` });
  addShape(slide, "rect", left, top, width, 6, accent, TRANSPARENT, 0, { slide: slideNo, role: `metric accent ${label}` });
  addText(slide, slideNo, value, left + 18, top + 20, width - 36, 44, {
    size: 30,
    color: TEXT,
    bold: true,
    face: TITLE_FACE,
    role: `metric value ${label}`,
  });
  addText(slide, slideNo, label, left + 18, top + 74, width - 36, 30, {
    size: 14,
    color: TEXT_SOFT,
    face: BODY_FACE,
    role: `metric label ${label}`,
  });
}

function addCard(slide, slideNo, left, top, width, height, title, body, accent = CYAN) {
  addShape(slide, "roundRect", left, top, width, height, PANEL, STROKE, 1.2, { slide: slideNo, role: `card ${title}` });
  addShape(slide, "rect", left, top, 6, height, accent, TRANSPARENT, 0, { slide: slideNo, role: `card accent ${title}` });
  addText(slide, slideNo, title, left + 22, top + 18, width - 44, 24, {
    size: 17,
    color: TEXT,
    bold: true,
    face: TITLE_FACE,
    role: `card title ${title}`,
  });
  addText(slide, slideNo, body, left + 22, top + 52, width - 44, height - 70, {
    size: 14,
    color: TEXT_SOFT,
    face: BODY_FACE,
    role: `card body ${title}`,
  });
}

function addArrow(slide, slideNo, left, top, width) {
  addShape(slide, "rect", left, top, Math.max(12, width - 12), 3, CYAN, TRANSPARENT, 0, { slide: slideNo, role: "arrow line" });
  addShape(slide, "rightArrow", left + width - 18, top - 6, 18, 14, CYAN, CYAN, 0, { slide: slideNo, role: "arrow head" });
}

function addFlowNode(slide, slideNo, left, top, width, height, indexText, title, body, accent) {
  addShape(slide, "roundRect", left, top, width, height, PANEL, STROKE, 1.2, { slide: slideNo, role: `node ${title}` });
  addShape(slide, "ellipse", left + 18, top + 18, 28, 28, accent, TRANSPARENT, 0, { slide: slideNo, role: `node badge ${title}` });
  addText(slide, slideNo, indexText, left + 27, top + 26, 10, 12, {
    size: 11,
    color: BG,
    bold: true,
    face: MONO_FACE,
    align: "center",
    role: `node index ${title}`,
  });
  addText(slide, slideNo, title, left + 58, top + 18, width - 74, 20, {
    size: 16,
    color: TEXT,
    bold: true,
    face: TITLE_FACE,
    role: `node title ${title}`,
  });
  addText(slide, slideNo, body, left + 18, top + 58, width - 36, height - 72, {
    size: 13,
    color: TEXT_SOFT,
    face: BODY_FACE,
    role: `node body ${title}`,
  });
}

function addSmallLabel(slide, slideNo, left, top, text, color = CYAN) {
  addText(slide, slideNo, text, left, top, 220, 16, {
    size: 12,
    color,
    bold: true,
    face: MONO_FACE,
    role: `label ${text}`,
  });
}

function addSwimlane(slide, slideNo, left, top, width, laneTitle, accent) {
  addShape(slide, "roundRect", left, top, width, 72, PANEL, STROKE, 1.2, { slide: slideNo, role: `swimlane ${laneTitle}` });
  addShape(slide, "rect", left, top, 6, 72, accent, TRANSPARENT, 0, { slide: slideNo, role: `swimlane accent ${laneTitle}` });
  addText(slide, slideNo, laneTitle, left + 22, top + 24, 180, 20, {
    size: 18,
    color: TEXT,
    bold: true,
    face: TITLE_FACE,
    role: `swimlane title ${laneTitle}`,
  });
}

async function slide1(presentation) {
  const s = presentation.slides.add();
  const n = 1;
  addBackground(s, n);
  addPill(s, n, 64, 84, 164, "FACTSHIELD");
  addText(s, n, "FactShield", 64, 126, 420, 56, {
    size: 46,
    color: TEXT,
    bold: true,
    face: TITLE_FACE,
    role: "cover title",
  });
  addText(
    s,
    n,
    "An explainable misinformation-verification system with retrieval, reasoning, analyst workflow, and report export in one platform.",
    66,
    204,
    544,
    88,
    { size: 21, color: TEXT_SOFT, face: BODY_FACE, role: "cover subtitle" },
  );
  addMetric(s, n, 64, 344, 152, 114, "5", "pipeline stages", CYAN);
  addMetric(s, n, 232, 344, 152, 114, "4", "validated demo cases", TEAL);
  addMetric(s, n, 400, 344, 152, 114, "1", "real report export flow", GOLD);

  addShape(s, "roundRect", 672, 100, 540, 492, PANEL, STROKE, 1.2, { slide: n, role: "cover system panel" });
  addSmallLabel(s, n, 708, 134, "PROJECT SNAPSHOT");
  const blocks = [
    ["Problem", "Manual verification is slow and fragmented.", 710, 178, CYAN],
    ["Gap", "Ordinary tools do not connect verdicts, evidence, and workflow.", 970, 178, GOLD],
    ["Approach", "Classify, retrieve, reason, explain, and operationalize.", 710, 342, TEAL],
    ["Product", "Reports, team review, settings, and analyst handoff.", 970, 342, RED],
  ];
  for (const [title, body, x, y, accent] of blocks) {
    addCard(s, n, x, y, 214, 120, title, body, accent);
  }
  addFooter(s, n, "FactShield final presentation", "April 28, 2026");
  addNotes(s, "Open by naming the system clearly and telling the audience this is both a technical pipeline and a usable product.", ["product"]);
}

async function slide2(presentation) {
  const s = presentation.slides.add();
  const n = 2;
  addBackground(s, n);
  addHeader(s, n, "Problem Statement", n, 12);
  addTitle(s, n, "Why misinformation verification is difficult in practice", "Claims spread quickly across text, screenshots, and short videos, but reliable verification still depends on slow manual evidence collection and interpretation.");
  addCard(s, n, 64, 274, 356, 180, "Speed mismatch", "False or misleading content spreads in minutes, while manual cross-checking often takes much longer.", CYAN);
  addCard(s, n, 462, 274, 356, 180, "Evidence fragmentation", "Sources, screenshots, and notes get scattered across tabs, chats, and ad hoc documents.", TEAL);
  addCard(s, n, 860, 274, 356, 180, "Low explainability", "A simple label is not enough when an analyst must justify why a claim was supported or refuted.", GOLD);
  addShape(s, "roundRect", 64, 500, 1152, 122, PANEL_2, STROKE, 1.2, { slide: n, role: "problem strip" });
  addSmallLabel(s, n, 92, 528, "CORE CHALLENGE", RED);
  addText(
    s,
    n,
    "We need a system that reduces verification time while preserving evidence quality, reasoning transparency, and an auditable review workflow.",
    92,
    556,
    1020,
    34,
    { size: 20, color: TEXT, face: BODY_FACE, role: "challenge text" },
  );
  addFooter(s, n, "The project is motivated by workflow failure, not only model accuracy.", "Problem framing");
  addNotes(s, "Keep the story operational. Faculty will understand this better if you talk about the analyst's job rather than the internet in general.", ["product"]);
}

async function slide3(presentation) {
  const s = presentation.slides.add();
  const n = 3;
  addBackground(s, n);
  addHeader(s, n, "Gap Analysis", n, 12);
  addTitle(s, n, "What is missing in common verification setups", "The gap is not just weak classification. The deeper gap is the absence of a unified pipeline from intake to evidence to final reporting.");

  addShape(s, "roundRect", 64, 280, 1148, 322, PANEL, STROKE, 1.2, { slide: n, role: "gap matrix" });
  const cols = [92, 362, 632, 902];
  const headers = ["Current approach", "Observed gap", "What FactShield adds", "Outcome"];
  for (let i = 0; i < headers.length; i += 1) {
    addText(s, n, headers[i], cols[i], 304, 220, 20, {
      size: 15,
      color: CYAN,
      bold: true,
      face: MONO_FACE,
      role: `gap header ${i}`,
    });
  }
  const rows = [
    ["Manual article search", "Evidence gathering is slow and inconsistent.", "Retrieval with FAISS and reranking.", "Faster evidence surfacing"],
    ["Label-only classifier", "Users cannot justify the output.", "Debate verdict plus trace and evidence tabs.", "Explainable decision support"],
    ["Static dashboards", "No operational handoff after analysis.", "Reports, team assignment, settings, export.", "Usable SaaS workflow"],
  ];
  for (let i = 0; i < rows.length; i += 1) {
    const y = 354 + i * 78;
    addShape(s, "rect", 84, y - 12, 1110, 1, STROKE, TRANSPARENT, 0, { slide: n, role: `gap rule ${i}` });
    for (let j = 0; j < rows[i].length; j += 1) {
      addText(s, n, rows[i][j], cols[j], y, 230, 42, {
        size: 14,
        color: j === 3 ? TEXT : TEXT_SOFT,
        bold: j === 3,
        face: j === 3 ? TITLE_FACE : BODY_FACE,
        role: `gap row ${i} col ${j}`,
      });
    }
  }
  addFooter(s, n, "This slide turns the project into a clear design response to an identified gap.", "Gap analysis");
  addNotes(s, "Use this slide to show that the project has a rationale beyond a model choice.", ["architecture", "product"]);
}

async function slide4(presentation) {
  const s = presentation.slides.add();
  const n = 4;
  addBackground(s, n);
  addHeader(s, n, "Our Approach", n, 12);
  addTitle(s, n, "Proposed solution: an end-to-end verification workspace", "FactShield combines machine learning, retrieval, reasoning, and analyst operations so verification can move from raw claim to final report inside one system.");
  addFlowNode(s, n, 64, 302, 220, 140, "1", "Ingest", "Accept claim text, image OCR output, or extracted video transcript.", CYAN);
  addFlowNode(s, n, 316, 302, 220, 140, "2", "Analyze", "Classify veracity and toxicity, then trigger search and retrieval when needed.", TEAL);
  addFlowNode(s, n, 568, 302, 220, 140, "3", "Reason", "Use a structured debate to synthesize the final verdict.", GOLD);
  addFlowNode(s, n, 820, 302, 220, 140, "4", "Explain", "Surface evidence, traces, and report-ready notes.", RED);
  addFlowNode(s, n, 1072, 302, 144, 140, "5", "Operate", "Assign, export, and review.", CYAN);
  addArrow(s, n, 288, 370, 18);
  addArrow(s, n, 540, 370, 18);
  addArrow(s, n, 792, 370, 18);
  addArrow(s, n, 1044, 370, 18);

  addCard(s, n, 64, 500, 356, 110, "Design objective 1", "Reduce analyst effort without hiding the reasoning path.", CYAN);
  addCard(s, n, 462, 500, 356, 110, "Design objective 2", "Connect verification outputs to persistent reports and review workflows.", TEAL);
  addCard(s, n, 860, 500, 356, 110, "Design objective 3", "Present results through a modern SaaS interface rather than disconnected scripts.", GOLD);
  addFooter(s, n, "This is the high-level answer to the gap slide.", "Approach overview");
  addNotes(s, "Say clearly: our contribution is not only detection, but also operationalization.", ["architecture", "product"]);
}

async function slide5(presentation) {
  const s = presentation.slides.add();
  const n = 5;
  addBackground(s, n);
  addHeader(s, n, "Architecture", n, 12);
  addTitle(s, n, "System architecture", "The system is organized as a frontend workspace, a FastAPI backend, and a verification pipeline with persistence and retrieval services.");

  addCard(s, n, 64, 278, 250, 132, "Frontend SaaS", "Command center, reports, team, settings, archive, and review surfaces.", CYAN);
  addCard(s, n, 64, 468, 250, 132, "Operator actions", "Paste claims, open reports, assign investigations, export briefings.", TEAL);

  addCard(s, n, 380, 232, 520, 112, "FastAPI orchestration layer", "Receives verification requests, manages task state, exposes feed and workspace APIs, and returns structured results.", GOLD);
  addCard(s, n, 380, 372, 520, 112, "Verification pipeline", "Classification, search, FAISS retrieval, reranking, debate reasoning, and explainability.", RED);
  addCard(s, n, 380, 512, 520, 112, "Persistence and services", "SQLite tasks, workspace state, result export, cache, and rate limits.", CYAN);

  addCard(s, n, 966, 278, 250, 132, "External evidence", "Trusted article sources and retrieved candidate evidence.", TEAL);
  addCard(s, n, 966, 468, 250, 132, "Outputs", "Verdict, evidence, reports, team assignment, and settings-aware workflow.", GOLD);

  addArrow(s, n, 318, 334, 50);
  addArrow(s, n, 900, 334, 50);
  addArrow(s, n, 318, 524, 50);
  addArrow(s, n, 900, 524, 50);
  addShape(s, "rect", 638, 346, 4, 24, CYAN, TRANSPARENT, 0, { slide: n, role: "vertical stack connector" });
  addShape(s, "rect", 638, 486, 4, 24, CYAN, TRANSPARENT, 0, { slide: n, role: "vertical stack connector" });

  addFooter(s, n, "This slide is your static architecture diagram for the viva-style part of the presentation.", "System view");
  addNotes(s, "Move left to right: user-facing layer, core backend, services, and outputs.", ["architecture", "product"]);
}

async function slide6(presentation) {
  const s = presentation.slides.add();
  const n = 6;
  addBackground(s, n);
  addHeader(s, n, "Flowchart", n, 12);
  addTitle(s, n, "Verification pipeline flow", "This is the logic path that turns an incoming claim into an explainable verdict.");

  const y = 308;
  addFlowNode(s, n, 64, y, 186, 144, "1", "Input", "User submits text, image, or video-derived text.", CYAN);
  addFlowNode(s, n, 286, y, 186, 144, "2", "Classify", "XLM-R predicts veracity and toxicity priors.", TEAL);
  addFlowNode(s, n, 508, y, 186, 144, "3", "Retrieve", "Search plus FAISS fetch evidence candidates.", GOLD);
  addFlowNode(s, n, 730, y, 186, 144, "4", "Debate", "Prosecutor, defense, and judge synthesize verdict.", RED);
  addFlowNode(s, n, 952, y, 186, 144, "5", "Explain", "Evidence tab, trace, notes, and report summary.", CYAN);
  addArrow(s, n, 252, 378, 24);
  addArrow(s, n, 474, 378, 24);
  addArrow(s, n, 696, 378, 24);
  addArrow(s, n, 918, 378, 24);

  addCard(s, n, 1080, 266, 136, 92, "Decision gate", "When confidence is weak or uncertain, retrieval becomes more important.", GOLD);
  addCard(s, n, 1080, 372, 136, 92, "Stored output", "Results become saved investigations and backend-backed report records.", TEAL);
  addCard(s, n, 64, 516, 1152, 96, "Why this matters", "The pipeline is designed so that model output is not the final artifact. The final artifact is an evidence-backed, reviewable verification result.", CYAN);
  addFooter(s, n, "This is the clearest pipeline explanation slide.", "Verification flow");
  addNotes(s, "Stress that explainability and persistence are downstream from reasoning, not optional extras.", ["architecture", "product"]);
}

async function slide7(presentation) {
  const s = presentation.slides.add();
  const n = 7;
  addBackground(s, n);
  addHeader(s, n, "User Workflow", n, 12);
  addTitle(s, n, "How a user moves through FactShield", "This operator workflow shows how the product turns backend intelligence into an actual review process.");

  addSwimlane(s, n, 64, 278, 1152, "1. Verification console", CYAN);
  addText(s, n, "Paste claim or upload media, then start analysis.", 304, 302, 460, 18, {
    size: 15,
    color: TEXT_SOFT,
    face: BODY_FACE,
    role: "workflow line 1",
  });
  addText(s, n, "Immediate system response: status, pipeline stage, retrieved evidence.", 782, 302, 360, 18, {
    size: 15,
    color: TEXT_SOFT,
    face: BODY_FACE,
    role: "workflow line 1b",
  });

  addSwimlane(s, n, 64, 366, 1152, "2. Review queue and investigations", TEAL);
  addText(s, n, "Open live items, inspect source context, and move cases into investigation handling.", 304, 390, 620, 18, {
    size: 15,
    color: TEXT_SOFT,
    face: BODY_FACE,
    role: "workflow line 2",
  });

  addSwimlane(s, n, 64, 454, 1152, "3. Reports, assignment, and settings", GOLD);
  addText(s, n, "Save metadata, assign investigators, update workspace controls, and export the final report.", 304, 478, 680, 18, {
    size: 15,
    color: TEXT_SOFT,
    face: BODY_FACE,
    role: "workflow line 3",
  });

  addSwimlane(s, n, 64, 542, 1152, "4. Delivery and briefing", RED);
  addText(s, n, "Decision-makers receive a downloadable report with verdict, confidence, notes, and evidence summary.", 304, 566, 710, 18, {
    size: 15,
    color: TEXT_SOFT,
    face: BODY_FACE,
    role: "workflow line 4",
  });

  addFooter(s, n, "Use this slide to connect technical depth to actual product use.", "User journey");
  addNotes(s, "Say that this is where the system becomes a SaaS workflow rather than a lab pipeline.", ["product"]);
}

async function slide8(presentation) {
  const s = presentation.slides.add();
  const n = 8;
  addBackground(s, n);
  addHeader(s, n, "Product", n, 12);
  addTitle(s, n, "Implemented SaaS workspace", "We redesigned the frontend to behave like a coherent operator product rather than a disconnected set of screens.");
  addShape(s, "roundRect", 64, 274, 760, 360, PANEL, STROKE, 1.2, { slide: n, role: "desktop frame" });
  await addImage(s, n, SCREEN_DESKTOP, 80, 290, 728, 328, "cover", "roundRect", "desktop screenshot");
  addShape(s, "roundRect", 856, 274, 300, 324, PANEL_2, STROKE, 1.2, { slide: n, role: "mobile frame" });
  await addImage(s, n, SCREEN_MOBILE, 884, 294, 244, 282, "contain", "roundRect", "mobile screenshot");
  addPill(s, n, 860, 614, 116, "REPORTS", "#10384F", CYAN);
  addPill(s, n, 988, 614, 100, "TEAM", "#10384F", TEAL);
  addPill(s, n, 1098, 614, 114, "SETTINGS", "#10384F", GOLD);
  addFooter(s, n, "A strong product slide matters because it proves implementation maturity.", "Frontend redesign");
  addNotes(s, "Call out the verification console, pipeline status, review queue, and the unified shell.", ["product"]);
}

async function slide9(presentation) {
  const s = presentation.slides.add();
  const n = 9;
  addBackground(s, n);
  addHeader(s, n, "Implementation", n, 12);
  addTitle(s, n, "Key capabilities delivered", "The project now includes backend-backed workflow features, not only verification endpoints.");
  addCard(s, n, 64, 282, 356, 124, "Report export", "Export produces a real downloadable report instead of a visual placeholder button.", CYAN);
  addCard(s, n, 462, 282, 356, 124, "Saved investigations", "Reports are now derived from persisted verification tasks and live backend records.", TEAL);
  addCard(s, n, 860, 282, 356, 124, "Team assignment", "Investigations can be assigned through the Team workspace and persisted.", GOLD);
  addCard(s, n, 64, 434, 356, 124, "Settings persistence", "Workspace controls save status, detail, and value instead of staying static.", RED);
  addCard(s, n, 462, 434, 356, 124, "Approval workflow", "Reports store owner, audience, approval status, reviewer identity, notes, and export metadata.", CYAN);
  addCard(s, n, 860, 434, 356, 124, "Text normalization", "Historic stored payloads were cleaned so report-facing text remains presentation-ready.", TEAL);
  addFooter(s, n, "This is the implementation-summary slide for the product engineering part.", "Delivered work");
  addNotes(s, "This is a good place to mention that the frontend is now backed by live data for reports, team, and settings.", ["product"]);
}

async function slide10(presentation) {
  const s = presentation.slides.add();
  const n = 10;
  addBackground(s, n);
  addHeader(s, n, "Validation", n, 12);
  addTitle(s, n, "Scenario testing before presentation", "We tested a short set of claims against the live backend to identify strong demo paths and risky edge cases.");
  addMetric(s, n, 64, 276, 120, 102, "4", "successful case types", CYAN);
  addMetric(s, n, 196, 276, 120, 102, "3", "evidence hits in strong cases", TEAL);
  addMetric(s, n, 328, 276, 120, 102, "1", "hate case flagged", RED);
  addMetric(s, n, 460, 276, 120, 102, "1", "invalid input blocked", GOLD);

  addShape(s, "roundRect", 64, 410, 520, 212, PANEL, STROKE, 1.2, { slide: n, role: "chart panel" });
  addSmallLabel(s, n, 88, 434, "RESULTS SNAPSHOT");
  const chart = s.charts.add("bar");
  chart.position = { left: 84, top: 466, width: 480, height: 128 };
  chart.categories = ["Full analyses", "Avg evidence", "Toxic flags", "Validation blocks"];
  const series = chart.series.add("Presentation pack");
  series.values = [4, 3, 1, 1];
  series.categories = chart.categories;
  series.fill = CYAN;
  series.stroke = { width: 1, style: "solid", fill: CYAN };
  chart.barOptions.direction = "column";
  chart.barOptions.grouping = "clustered";
  chart.hasLegend = false;
  chart.dataLabels.showValue = true;
  chart.dataLabels.position = "outEnd";
  chart.plotAreaFill = PANEL_2;
  chart.titleTextStyle.typeface = TITLE_FACE;
  chart.xAxis.textStyle.typeface = BODY_FACE;
  chart.yAxis.textStyle.typeface = BODY_FACE;
  chart.dataLabels.textStyle.typeface = BODY_FACE;
  chart.xAxis.textStyle.fontSize = 12;
  chart.yAxis.textStyle.fontSize = 12;
  chart.dataLabels.textStyle.fontSize = 12;

  addShape(s, "roundRect", 618, 360, 580, 262, PANEL, STROKE, 1.2, { slide: n, role: "table panel" });
  const rows = [
    ["Factual claim", "Supports", "real", "3"],
    ["Political misinformation", "Refutes", "fake", "3"],
    ["Toxic post", "Refutes", "misleading", "3"],
    ["Tiny invalid input", "Rejected", "400", "0"],
  ];
  const cols = [636, 878, 980, 1084];
  const headers = ["Scenario", "Verdict", "Veracity", "Evidence"];
  for (let i = 0; i < headers.length; i += 1) {
    addText(s, n, headers[i], cols[i], 388, 90, 18, {
      size: 13,
      color: CYAN,
      bold: true,
      face: MONO_FACE,
      role: `table header ${headers[i]}`,
    });
  }
  for (let i = 0; i < rows.length; i += 1) {
    const y = 426 + i * 48;
    addShape(s, "rect", 632, y - 10, 544, 1, STROKE, TRANSPARENT, 0, { slide: n, role: `table rule ${i}` });
    addText(s, n, rows[i][0], cols[0], y, 220, 18, { size: 13, color: TEXT, face: BODY_FACE, role: `scenario ${i}` });
    addText(s, n, rows[i][1], cols[1], y, 90, 18, {
      size: 13,
      color: rows[i][1] === "Supports" ? TEAL : rows[i][1] === "Rejected" ? GOLD : TEXT,
      bold: true,
      face: BODY_FACE,
      role: `verdict ${i}`,
    });
    addText(s, n, rows[i][2], cols[2], y, 90, 18, { size: 13, color: TEXT_SOFT, face: BODY_FACE, role: `veracity ${i}` });
    addText(s, n, rows[i][3], cols[3], y, 60, 18, { size: 13, color: TEXT_SOFT, face: BODY_FACE, role: `evidence ${i}` });
  }
  addFooter(s, n, "These results are why tomorrow's demo should stay inside rehearsal-tested claims.", "Scenario testing");
  addNotes(s, "Be explicit that vague claims are possible but less convincing as a live presentation route.", ["scenarios"]);
}

async function slide11(presentation) {
  const s = presentation.slides.add();
  const n = 11;
  addBackground(s, n);
  addHeader(s, n, "Limits & Future Work", n, 12);
  addTitle(s, n, "Current limitations and next improvements", "A credible system presentation should acknowledge what is working now and what still deserves improvement.");
  addCard(s, n, 64, 284, 356, 236, "Current limitations", "1. Vague claims can still receive strong verdicts.\n2. The strongest demo path is still text-first.\n3. Wider multimodal validation is still limited.\n4. Some judgments still depend on retrieval quality.", RED);
  addCard(s, n, 462, 284, 356, 236, "Near-term improvements", "1. Better uncertainty handling for weak inputs.\n2. More image and video demo validation.\n3. Richer reviewer audit trail.\n4. Expanded evidence-source diversity.", GOLD);
  addCard(s, n, 860, 284, 356, 236, "Why the project is still strong", "The system already connects ML, retrieval, explainability, persistence, and product workflow in one coherent implementation.", CYAN);
  addShape(s, "roundRect", 64, 556, 1152, 72, PANEL_2, STROKE, 1.2, { slide: n, role: "future strip" });
  addText(s, n, "Good presentation framing: this project solves the integrated verification workflow problem and creates a solid base for deeper multimodal and uncertainty-aware research.", 92, 582, 1080, 20, {
    size: 17,
    color: TEXT,
    face: BODY_FACE,
    role: "future strip text",
  });
  addFooter(s, n, "Faculty usually appreciate a strong limitations slide.", "Roadmap");
  addNotes(s, "This slide helps you stay honest and calm in Q and A.", ["product", "scenarios"]);
}

async function slide12(presentation) {
  const s = presentation.slides.add();
  const n = 12;
  addBackground(s, n);
  addHeader(s, n, "Conclusion", n, 12);
  addTitle(s, n, "FactShield in one sentence", "FactShield is an explainable misinformation-verification platform that connects technical analysis to real analyst workflow.");
  addCard(s, n, 64, 292, 340, 200, "Problem addressed", "Slow, fragmented, and weakly explainable verification workflows.", CYAN);
  addCard(s, n, 470, 292, 340, 200, "System contribution", "A pipeline that classifies, retrieves, reasons, explains, and operationalizes results.", TEAL);
  addCard(s, n, 876, 292, 340, 200, "Product contribution", "A SaaS interface with reports, assignments, settings, and export built on live backend data.", GOLD);
  addShape(s, "roundRect", 64, 536, 1152, 82, PANEL, STROKE, 1.2, { slide: n, role: "closing strip" });
  addText(s, n, "Thank you. The next step in the presentation is the live walkthrough using the tested claim sequence.", 92, 566, 900, 22, {
    size: 20,
    color: TEXT,
    face: BODY_FACE,
    role: "closing line",
  });
  addText(s, n, "Questions", 1060, 558, 110, 30, {
    size: 24,
    color: CYAN,
    bold: true,
    face: TITLE_FACE,
    align: "right",
    role: "questions",
  });
  addFooter(s, n, "End here before switching to the live product demo.", "Presentation close");
  addNotes(s, "This is the clean closing slide. Pause here before the live demo or Q and A.", ["product"]);
}

async function createDeck() {
  await ensureDirs();
  const presentation = Presentation.create({ slideSize: { width: W, height: H } });
  presentation.theme.colorScheme = {
    name: "FactShield",
    themeColors: {
      accent1: CYAN,
      accent2: TEAL,
      accent3: GOLD,
      accent4: RED,
      bg1: BG,
      bg2: PANEL,
      tx1: TEXT,
      tx2: TEXT_SOFT,
    },
  };
  await slide1(presentation);
  await slide2(presentation);
  await slide3(presentation);
  await slide4(presentation);
  await slide5(presentation);
  await slide6(presentation);
  await slide7(presentation);
  await slide8(presentation);
  await slide9(presentation);
  await slide10(presentation);
  await slide11(presentation);
  await slide12(presentation);
  return presentation;
}

async function writeInspectArtifact(presentation) {
  const lines = [
    JSON.stringify({ kind: "deck", id: DECK_ID, slideCount: presentation.slides.count, slideSize: { width: W, height: H } }),
    ...inspectRecords.map((item) => JSON.stringify(item)),
  ];
  await fs.writeFile(INSPECT_PATH, `${lines.join("\n")}\n`, "utf8");
}

async function verifyAndExport(presentation) {
  await writeInspectArtifact(presentation);
  for (let idx = 0; idx < presentation.slides.items.length; idx += 1) {
    const slide = presentation.slides.items[idx];
    const preview = await presentation.export({ slide, format: "png", scale: 1 });
    await saveBlobToFile(preview, path.join(PREVIEW_DIR, `slide-${String(idx + 1).padStart(2, "0")}.png`));
  }
  const pptx = await PresentationFile.exportPptx(presentation);
  const pptxPath = path.join(OUT_DIR, "output.pptx");
  await pptx.save(pptxPath);
  return pptxPath;
}

const presentation = await createDeck();
const pptxPath = await verifyAndExport(presentation);
console.log(pptxPath);
