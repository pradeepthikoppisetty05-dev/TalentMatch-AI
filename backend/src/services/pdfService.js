import { execSync } from "child_process";
import { writeFileSync, readFileSync, mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import PDFDocument from "pdfkit";
import { PDFDocument as LibPDF } from "pdf-lib";

// Color palette
const C = {
  blue:      "#2563eb",
  blueDark:  "#1e40af",
  blueLight: "#dbeafe",
  white:     "#ffffff",
  dark:      "#0f172a",
  heading:   "#1e293b",
  body:      "#334155",
  muted:     "#64748b",
  border:    "#e2e8f0",
  slateBg:   "#f8fafc",
  slateBar:  "#f1f5f9",
  emerald:   "#059669",
  emeraldBg: "#d1fae5",
  rose:      "#be123c",
  roseBg:    "#ffe4e6",
  amber:     "#b45309",
  amberBg:   "#fef3c7",
  indigo:    "#4338ca",
  indigoBg:  "#e0e7ff",
  violet:    "#6d28d9",
  violetBg:  "#ede9fe",
  starFill:  "#f59e0b",
  starEmpty: "#cbd5e1",
};
function verdictColors(verdict) {
  if (verdict === "Proceed") return { bg: "#d1fae5", bar: "#059669", text: "#065f46", label: "PROCEED" };
  if (verdict === "Maybe")   return { bg: "#fef3c7", bar: "#d97706", text: "#92400e", label: "CONSIDER" };
  return                            { bg: "#ffe4e6", bar: "#be123c", text: "#881337", label: "REJECT"   };
}

// Page constants
const PW = 595.28;
const PH = 841.89;
const ML = 44;
const MR = 44;
const CW = PW - ML - MR;
const BOTTOM = 44; 

function filledRect(doc, x, y, w, h, color) {
  doc.save().rect(x, y, w, h).fill(color).restore();
}

function roundedRect(doc, x, y, w, h, r, color) {
  doc.save().roundedRect(x, y, w, h, r).fill(color).restore();
}

function strokedRect(doc, x, y, w, h, color, lw = 0.5) {
  doc.save().lineWidth(lw).rect(x, y, w, h).stroke(color).restore();
}

function hLine(doc, x, y, len, color = C.border, lw = 0.5) {
  doc.save().lineWidth(lw).moveTo(x, y).lineTo(x + len, y).stroke(color).restore();
}

function ensureSpace(doc, y, needed) {
  if (y + needed > PH - BOTTOM) {
    doc.addPage();
    return 44;
  }
  return y;
}

function sectionHeader(doc, y, title) {
  filledRect(doc, ML, y, CW, 26, C.slateBar);
  hLine(doc, ML, y, CW, C.border);
  hLine(doc, ML, y + 26, CW, C.border);
  filledRect(doc, ML, y, 3, 26, C.blue);
  doc.font("Helvetica-Bold").fontSize(8).fillColor(C.muted)
     .text(title.toUpperCase(), ML + 12, y + 9, { width: CW - 16, characterSpacing: 0.8 });
  return y + 34;
}

function pill(doc, x, y, label, bg, fg, w = 68) {
  roundedRect(doc, x, y, w, 15, 7, bg);
  doc.font("Helvetica-Bold").fontSize(7).fillColor(fg)
     .text(label.toUpperCase(), x, y + 4, { width: w, align: "center", characterSpacing: 0.3 });
}

function bulletItem(doc, y, text, dotColor) {
  y = ensureSpace(doc, y, 20);
  doc.save().circle(ML + 7, y + 5.5, 2.5).fill(dotColor).restore();
  doc.font("Helvetica").fontSize(9.5).fillColor(C.body)
     .text(text, ML + 16, y, { width: CW - 16, lineGap: 2 });
  const h = doc.heightOfString(text, { width: CW - 16, lineGap: 2 });
  return y + Math.max(h + 6, 18);
}

function drawStar(doc, cx, cy, r, color) {
  const pts = [];
  for (let i = 0; i < 5; i++) {
    const outer = (Math.PI / 2) + (i * 2 * Math.PI) / 5;
    pts.push([cx + r * Math.cos(outer), cy - r * Math.sin(outer)]);
    const inner = outer + Math.PI / 5;
    const ir = r * 0.42;
    pts.push([cx + ir * Math.cos(inner), cy - ir * Math.sin(inner)]);
  }
  doc.save().moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) doc.lineTo(pts[i][0], pts[i][1]);
  doc.closePath().fill(color).restore();
}

function starRow(doc, x, y, rating, maxStars = 5) {
  const r = 5;    
  const gap = 13; 
  for (let i = 1; i <= maxStars; i++) {
    drawStar(doc, x + (i - 1) * gap + r, y + r, r,
             i <= rating ? C.starFill : C.starEmpty);
  }
  if (rating > 0) {
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(C.amber)
       .text(rating + "/5", x + maxStars * gap + 4, y, { lineBreak: false });
  }
}

function levelColor(level) {
  if (level === "High")   return { bg: C.emeraldBg, text: C.emerald };
  if (level === "Medium") return { bg: C.indigoBg,  text: C.indigo  };
  if (level === "Low")    return { bg: C.amberBg,   text: C.amber   };
  return                         { bg: C.slateBg,   text: C.muted   };
}

function catColor(cat) {
  if (cat === "Technical")  return { bg: C.indigoBg,  text: C.indigo  };
  if (cat === "Behavioral") return { bg: C.amberBg,   text: C.amber   };
  if (cat === "Fitment")    return { bg: C.emeraldBg, text: C.emerald };
  if (cat === "Interest")   return { bg: C.violetBg,  text: C.violet  };
  return                           { bg: C.slateBg,   text: C.muted   };
}

function categoryBar(doc, x, y, w, label, value, barColor) {
  doc.font("Helvetica-Bold").fontSize(8).fillColor(C.muted)
     .text(label, x, y, { width: 90, lineBreak: false });
  const barX = x + 96;
  const barW = w - 96 - 44;
  // track
  roundedRect(doc, barX, y + 1, barW, 8, 4, C.border);
  // fill
  const fill = Math.max(Math.round(barW * value / 100), 3);
  roundedRect(doc, barX, y + 1, fill, 8, 4, barColor);
  // value
  doc.font("Helvetica-Bold").fontSize(8).fillColor(C.heading)
     .text(value + "%", barX + barW + 6, y, { width: 36, align: "right", lineBreak: false });
  return y + 16;
}
// MAIN REPORT BUILDER

function buildReportBuffer(result, interviewQuestions, candidateName, jobTitle) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      bufferPages: true,
      info: { Title: "Candidate Analysis Report", Author: "TalentMatch AI" },
    });

    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end",  () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const hasSubtitle = candidateName || jobTitle;
    const headerH = hasSubtitle ? 82 : 62;

    filledRect(doc, 0, 0, PW, headerH, C.blue);
    doc.save()
       .moveTo(PW - 100, 0).lineTo(PW, 0).lineTo(PW, headerH)
       .closePath().fill(C.blueDark).restore();

    doc.font("Helvetica-Bold").fontSize(19).fillColor(C.white)
       .text("Candidate Analysis Report", ML, 20, { width: CW });

    if (hasSubtitle) {
      const parts = [candidateName, jobTitle].filter(Boolean);
      doc.font("Helvetica").fontSize(10).fillColor("rgba(255,255,255,0.72)")
         .text(parts.join("   ·   "), ML, 48, { width: CW });
    }

    // MATCH SCORE
    const bannerY = headerH + 12;
    roundedRect(doc, ML, bannerY, CW, 48, 6, C.blueLight);
    strokedRect(doc, ML, bannerY, CW, 48, C.border);

    doc.font("Helvetica-Bold").fontSize(28).fillColor(C.blue)
       .text(`${result.matchScore}%`, ML + 16, bannerY + 9, { lineBreak: false });

    const label =
      result.matchScore >= 80 ? "Exceptional" :
      result.matchScore >= 60 ? "Qualified"   : "Requires Review";
    const lc =
      result.matchScore >= 80 ? { text: C.emerald, bg: C.emeraldBg } :
      result.matchScore >= 60 ? { text: C.amber,   bg: C.amberBg   } :
                                { text: C.rose,    bg: C.roseBg    };
    roundedRect(doc, ML + 76, bannerY + 15, 106, 18, 9, lc.bg);
    doc.font("Helvetica-Bold").fontSize(9).fillColor(lc.text)
       .text(label, ML + 76, bannerY + 20, { width: 106, align: "center" });

    const barX = ML + 192;
    const barW = CW - 192 - 12;
    const barY = bannerY + 20;
    roundedRect(doc, barX, barY, barW, 8, 4, C.border);
    const fillW = Math.max(Math.round(barW * result.matchScore / 100), 4);
    roundedRect(doc, barX, barY, fillW, 8, 4, C.blue);

    let y = bannerY + 62;

    // ── VERDICT + CATEGORY SCORES BLOCK ────────────────────────────────────
    if (result.proceedVerdict) {
      const vc = verdictColors(result.proceedVerdict);
      const barHeight = 12;
      const gap = 2;
      const paddingTop = 10;
      const paddingBottom = 8;

      const totalBarsHeight = (4 * barHeight) + (3 * gap);
      const blockH = paddingTop + totalBarsHeight + paddingBottom;
      y = ensureSpace(doc, y, blockH + 8);

      const halfW = Math.floor(CW / 2) - 4;
      roundedRect(doc, ML, y, halfW, blockH, 6, vc.bg);
      roundedRect(doc, ML, y, 4, blockH, 2, vc.bar);
 
      doc.font("Helvetica-Bold").fontSize(8).fillColor(C.muted)
         .text("HIRING VERDICT", ML + 12, y + 10, { characterSpacing: 0.5 });
      doc.font("Helvetica-Bold").fontSize(20).fillColor(vc.text)
         .text(vc.label, ML + 12, y + 22, { lineBreak: false });
 
      // Category scores right
      const csX = ML + halfW + 8;
      const csW = CW - halfW - 8;
      roundedRect(doc, csX, y, csW, blockH, 6, C.slateBg);
      strokedRect(doc, csX, y, csW, blockH, C.border);
 
      if (result.categoryScores) {
        const cs = result.categoryScores;
        const catDefs = [
          { label: "Hard Skills", key: "hardSkills",  color: "#4f46e5" },
          { label: "Soft Skills", key: "softSkills",  color: "#7c3aed" },
          { label: "Experience",  key: "experience",  color: "#059669" },
          { label: "Education",   key: "education",   color: "#d97706" },
        ];
        const innerPadding = 8;
        const usableWidth = csW - (innerPadding * 2);
        let cy = y + 10;
        for (const { label, key, color } of catDefs) {
          cy = categoryBar(doc, csX + innerPadding, cy, usableWidth, label, cs[key] ?? 0, color);
        }
      }
 
      if (result.proceedReason) {
        const reasonY = y + blockH + 6;
        const reasonH = Math.max(
          doc.heightOfString(result.proceedReason, { width: CW - 20, lineGap: 1.5 }) + 14,
          28
        );
        y = ensureSpace(doc, reasonY - 6, reasonH + 10);
        const actualY = y === 44 ? 44 : reasonY;
        roundedRect(doc, ML, actualY, CW, reasonH, 5, vc.bg);
        roundedRect(doc, ML, actualY, 3, reasonH, 2, vc.bar);
        doc.font("Helvetica").fontSize(9).fillColor(vc.text)
           .text(result.proceedReason, ML + 12, actualY + 7, {
             width: CW - 24, lineGap: 1.5
           });
        y = actualY + reasonH + 10;
      } else {
        y = y + blockH + 10;
      }
    }

    y = ensureSpace(doc, y, 80);
    y = sectionHeader(doc, y, "Summary");
    doc.font("Helvetica").fontSize(9.5).fillColor(C.body)
       .text(result.summary, ML, y, { width: CW, lineGap: 3, align: "justify" });
    y += doc.heightOfString(result.summary, { width: CW, lineGap: 3 }) + 14;

    y = ensureSpace(doc, y, 60);
    y = sectionHeader(doc, y, "Strengths");
    for (const s of result.strengths) {
      y = bulletItem(doc, y, s, C.emerald);
    }
    y += 10;

    y = ensureSpace(doc, y, 60);
    y = sectionHeader(doc, y, "Skill Gaps");
    for (const g of result.gaps) {
      y = bulletItem(doc, y, g, C.rose);
    }
    y += 10;

    y = ensureSpace(doc, y, 80);
    y = sectionHeader(doc, y, "Technical Skills");

    const col1W = CW - 110;
    const col2X = ML + col1W;

    filledRect(doc, ML, y, CW, 22, C.slateBar);
    strokedRect(doc, ML, y, CW, 22, C.border);
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor(C.muted)
       .text("SKILL / COMPETENCY", ML + 10, y + 7, { characterSpacing: 0.5 });
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor(C.muted)
       .text("ASSESSMENT", col2X, y + 7, { width: 110, align: "center", characterSpacing: 0.5 });
    y += 22;

    for (let i = 0; i < result.technicalSkillsMatch.length; i++) {
      const skill = result.technicalSkillsMatch[i];
      y = ensureSpace(doc, y, 26);
      const rowBg = i % 2 === 0 ? C.white : "#f9fafb";
      filledRect(doc, ML, y, CW, 26, rowBg);
      strokedRect(doc, ML, y, CW, 26, C.border, 0.4);
      doc.save().lineWidth(0.4)
         .moveTo(col2X, y).lineTo(col2X, y + 26).stroke(C.border).restore();
      doc.font("Helvetica-Bold").fontSize(9.5).fillColor(C.heading)
         .text(skill.skill, ML + 10, y + 8, { width: col1W - 20 });
      const lv = levelColor(skill.level);
      pill(doc, col2X + 18, y + 6, skill.level, lv.bg, lv.text);
      y += 26;
    }
    y += 14;

    y = ensureSpace(doc, y, 60);
    y = sectionHeader(doc, y, "Strategic Recommendations");

    for (const rec of result.recommendations) {
      const recH = Math.max(
        doc.heightOfString(rec, { width: CW - 32, lineGap: 2 }) + 20, 36
      );
      y = ensureSpace(doc, y, recH + 6);

      roundedRect(doc, ML, y, CW, recH, 5, "#1e293b");
      roundedRect(doc, ML, y, 3, recH, 2, "#818cf8"); 
      doc.font("Helvetica-Bold").fontSize(12).fillColor("#818cf8")
         .text("›", ML + 10, y + (recH / 2) - 8, { lineBreak: false });
      doc.font("Helvetica").fontSize(9.5).fillColor("#e0e7ff")
         .text(rec, ML + 24, y + 10, { width: CW - 36, lineGap: 2 });
      y += recH + 6;
    }
    y += 8;

    y = ensureSpace(doc, y, 60);
    y = sectionHeader(doc, y, "Interview Questions & Scorecard");

    const totalQuestions = Math.max(
      result.suggestedQuestions?.length || 0,
      interviewQuestions?.length || 0
    );

    for (let i = 0; i < totalQuestions; i++) {
      const q = result.suggestedQuestions[i] || {};
      const iq = interviewQuestions[i] || {};

      const questionTextValue = q.question || iq.question || "Custom Question";
      const category = q.category || "Custom";

      const hasAnswer = iq.answer?.trim();
      const hasRating = iq.rating > 0;
      const hasReview = iq.review?.trim();

      const cc = catColor(category);

      const questionText = `${i + 1}. ${questionTextValue}`;

      const qH = doc.heightOfString(questionText, { width: CW - 96, lineGap: 2 });

      const aH = hasAnswer
        ? doc.heightOfString(iq.answer.trim(), { width: CW - 36, lineGap: 2 }) + 28
        : 0;

      const reviewH = hasReview
        ? doc.heightOfString(iq.review.trim(), { width: CW - 36, lineGap: 2 }) + 28
        : 0;

      const rH = hasRating ? 22 : 0;

      const totalH =
        28 + qH +
        (hasAnswer || hasRating || hasReview ? 10 : 0) +
        aH + reviewH + rH + 8;

      y = ensureSpace(doc, y, totalH);

      roundedRect(doc, ML, y, CW, totalH, 5, C.slateBg);
      strokedRect(doc, ML, y, CW, totalH, C.border, 0.5);
      roundedRect(doc, ML, y, 3, totalH, 2, cc.text);

      pill(doc, ML + 10, y + 8, category, cc.bg, cc.text, 72);

      doc.font("Helvetica-Bold")
        .fontSize(9.5)
        .fillColor(C.heading)
        .text(questionText, ML + 90, y + 9, { width: CW - 100, lineGap: 2 });

      let iy = y + 16 + qH;

      if (hasAnswer) {
        iy += 8;
        const aTextH = doc.heightOfString(iq.answer.trim(), { width: CW - 36, lineGap: 2 });
        const aBoxH = aTextH + 20;

        roundedRect(doc, ML + 10, iy, CW - 20, aBoxH, 4, C.white);
        strokedRect(doc, ML + 10, iy, CW - 20, aBoxH, C.border, 0.4);

        doc.font("Helvetica")
          .fontSize(9.5)
          .fillColor(C.body)
          .text(iq.answer.trim(), ML + 16, iy + 16, {
            width: CW - 36,
            lineGap: 2,
          });

        iy += aBoxH + 6;
      }

      if (hasReview) {
        const rTextH = doc.heightOfString(iq.review.trim(), {
          width: CW - 36,
          lineGap: 2,
        });

        const rBoxH = rTextH + 20;

        roundedRect(doc, ML + 10, iy, CW - 20, rBoxH, 4, "#fefce8");
        strokedRect(doc, ML + 10, iy, CW - 20, rBoxH, C.border, 0.4);

        doc.font("Helvetica-Bold")
          .fontSize(7.5)
          .fillColor(C.muted)
          .text("REVIEW", ML + 16, iy + 6);

        doc.font("Helvetica")
          .fontSize(9.5)
          .fillColor(C.body)
          .text(iq.review.trim(), ML + 16, iy + 16, {
            width: CW - 36,
            lineGap: 2,
          });

        iy += rBoxH + 6;
      }

      if (hasRating) {
        doc.font("Helvetica-Bold")
          .fontSize(7.5)
          .fillColor(C.muted)
          .text("RESPONSE RATING", ML + 10, iy + 4, { lineBreak: false });

        starRow(doc, ML + 122, iy + 3, iq.rating);
      }

      y += totalH + 8;
    }

    // OVERALL AVERAGE RATING 
    const rated = interviewQuestions.filter((q) => q?.rating > 0);
    if (rated.length > 0) {
      const avg = rated.reduce((a, q) => a + q.rating, 0) / rated.length;
      const avgStr = avg.toFixed(1);

      y = ensureSpace(doc, y, 58);
      roundedRect(doc, ML, y, CW, 54, 6, "#0f172a");
      filledRect(doc, ML, y, 3, 54, C.starFill); 

      doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#a5b4fc")
         .text("OVERALL INTERVIEW SCORE", ML + 14, y + 11, { characterSpacing: 0.6 });

      doc.font("Helvetica-Bold").fontSize(24).fillColor(C.starFill)
         .text(avgStr, ML + 14, y + 23, { lineBreak: false });
      doc.font("Helvetica").fontSize(11).fillColor("#64748b")
         .text(" / 5", ML + 56, y + 29, { lineBreak: false });

      starRow(doc, ML + 88, y + 28, Math.round(avg));

      doc.font("Helvetica").fontSize(8).fillColor("#64748b")
         .text(
           `Based on ${rated.length} rated question${rated.length !== 1 ? "s" : ""}`,
           ML + CW - 148, y + 30, { width: 140, align: "right" }
         );
      y += 62;
    }

    doc.end();
  });
}

// RESUME CONVERTER  (DOCX / TXT → PDF)

async function docxToPdfBuffer(buffer) {

  const tmpDir = mkdtempSync(join(tmpdir(), "tm-lo-"));

  try {
    const inFile = join(tmpDir, "resume.docx");
    const outFile = join(tmpDir, "resume.pdf");
    const profile = join(tmpDir, "lo-profile");

    writeFileSync(inFile, buffer);

    const sofficePath = `"C:\\Program Files\\LibreOffice\\program\\soffice.exe"`;

    execSync(
      `${sofficePath} --headless --norestore ` +
      `"-env:UserInstallation=file:///${profile.replace(/\\/g, "/")}" ` +
      `--convert-to pdf "${inFile}" --outdir "${tmpDir}"`,
      { timeout: 30000, stdio: "pipe" }
    );

    return readFileSync(outFile);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
  
}

function cleanResumeText(text) {
  return text
    .replace(/[^\x00-\x7F\n•\-–—|]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\t+/g, " | ")
    .replace(/ +/g, " ")
    .replace(/[•·]/g, "•")
    .replace(/[–—]/g, "-")
    .replace(/\n{2,}/g, "\n\n")
    .trim();
}

function textToPdfBuffer(rawText) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 44, bottom: 44, left: ML, right: MR },
      bufferPages: true,
      info: { Title: "Resume" },
    });

    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const cleanedText = cleanResumeText(rawText);
    const lines = cleanedText.replace(/\r\n/g, "\n").split("\n");

    let hasPrintedName = false;
    let blanks = 0;

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const t = raw.trim();

      if (!t) {
        blanks++;
        if (blanks === 1) doc.moveDown(0.4);
        continue;
      }

      blanks = 0;

      const isLikelyName =
        !hasPrintedName &&
        i < 3 &&
        /^[A-Za-z\s.]+$/.test(t) &&
        t.split(" ").length <= 4 &&
        t.length < 40;

      if (isLikelyName) {
        doc.font("Helvetica-Bold")
          .fontSize(16)
          .fillColor(C.dark)
          .text(t, { align: "center" });
        doc.moveDown(0.2);
        hasPrintedName = true;
        continue;
      }

      const isHeading =
        t === t.toUpperCase() &&
        t.length > 2 &&
        t.length < 60 &&
        /[A-Z]/.test(t);

      if (isHeading) {
        doc.moveDown(0.5);
        doc.font("Helvetica-Bold")
          .fontSize(10)
          .fillColor(C.blue)
          .text(t);

        const ly = doc.y + 2;
        doc.save()
          .lineWidth(0.5)
          .moveTo(ML, ly)
          .lineTo(PW - MR, ly)
          .stroke(C.border)
          .restore();

        doc.moveDown(0.3);
        continue;
      }

      if (/^[-•·]\s*/.test(t)) {
        doc.font("Helvetica")
          .fontSize(9.5)
          .fillColor(C.body)
          .text("• " + t.replace(/^[-•·]\s*/, ""), {
            indent: 12,
            lineGap: 1.5,
          });
        continue;
      }

      if (t.includes(" | ")) {
        const [left, ...rest] = t.split(" | ");
        doc.font("Helvetica-Bold")
          .fontSize(9.5)
          .fillColor(C.heading)
          .text(left.trim(), { continued: rest.length > 0 });

        if (rest.length) {
          doc.font("Helvetica")
            .fontSize(9)
            .fillColor(C.muted)
            .text("  |  " + rest.join(" | "));
        }
        continue;
      }

      doc.font("Helvetica")
        .fontSize(9.5)
        .fillColor(C.body)
        .text(t, { lineGap: 1.5 });
    }

    doc.end();
  });
}

// MASTER EXPORT

/**
 * @param {object}   result             
 * @param {object[]} interviewQuestions 
 * @param {Buffer}   resumeBuffer       
 * @param {string}   mimeType
 * @param {string}   candidateName
 * @param {string}   jobTitle
 * @returns {Promise<Buffer>}
 */
export async function generateFullReport(
  result,
  interviewQuestions = [],
  resumeBuffer,
  mimeType,
  candidateName = "",
  jobTitle = ""
) {
  const reportBuf = await buildReportBuffer(
    result, interviewQuestions, candidateName, jobTitle
  );

  let resumePdfBuf;
  if (mimeType === "application/pdf") {
    resumePdfBuf = resumeBuffer;
  } else if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  ) {
    resumePdfBuf = await docxToPdfBuffer(resumeBuffer);
  } else {
    resumePdfBuf = await textToPdfBuffer(resumeBuffer.toString("utf-8"));
  }

  const merged = await LibPDF.create();

  const rDoc = await LibPDF.load(reportBuf);
  for (const pg of await merged.copyPages(rDoc, rDoc.getPageIndices())) {
    merged.addPage(pg);
  }

  const sDoc = await LibPDF.load(resumePdfBuf);
  for (const pg of await merged.copyPages(sDoc, sDoc.getPageIndices())) {
    merged.addPage(pg);
  }

  return Buffer.from(await merged.save());
}

export async function generateComparisonReport(candidates, jobTitle = "") {
  const analyzed = candidates.filter((c) => c.result);
  if (!analyzed.length) throw new Error("No analyzed candidates to compare.");

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      bufferPages: true,
      info: { Title: "Candidate Comparison Report", Author: "TalentMatch AI" },
    });

    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Dimensions
    const LW = 841.89;
    const LH = 595.28;
    const LML = 40;
    const LMR = 40;
    const LCW = LW - LML - LMR;

    // HEADER 
    const headerH = jobTitle ? 68 : 52;
    filledRect(doc, 0, 0, LW, headerH, C.blue);

    doc.save()
      .moveTo(LW - 80, 0)
      .lineTo(LW, 0)
      .lineTo(LW, headerH)
      .closePath()
      .fill(C.blueDark)
      .restore();

    doc.font("Helvetica-Bold").fontSize(17).fillColor(C.white)
      .text("Candidate Comparison Report", LML, 16, { width: LCW });

    if (jobTitle) {
      doc.font("Helvetica").fontSize(9.5).fillColor("rgba(255,255,255,0.70)")
        .text(jobTitle, LML, 40, { width: LCW });
    }

    const CATEGORIES = [
      { key: "hardSkills", label: "Hard Skills", color: "#4f46e5" },
      { key: "softSkills", label: "Soft Skills", color: "#7c3aed" },
      { key: "experience", label: "Experience", color: "#059669" },
      { key: "education", label: "Education", color: "#d97706" },
    ];

    const ROWS = [
      { key: "matchScore", label: "Overall Match" },
      ...CATEGORIES.map((c) => ({
        key: c.key,
        label: c.label,
        color: c.color,
        isCategory: true,
      })),
      { key: "verdict", label: "Verdict" },
    ];

    const numCols = ROWS.length;
    const nameW = 140;
    const dataW = (LCW - nameW) / numCols;
    const rowH = 32;
    const headerRowH = 28;

    let ty = headerH + 16;

    // TABLE HEADER 
    filledRect(doc, LML, ty, LCW, headerRowH, C.slateBar);
    hLine(doc, LML, ty, LCW, C.border);
    hLine(doc, LML, ty + headerRowH, LCW, C.border);

    doc.font("Helvetica-Bold").fontSize(7.5).fillColor(C.muted)
      .text("CANDIDATE", LML + 8, ty + 10, { width: nameW });

    ROWS.forEach((row, i) => {
      const cx = LML + nameW + i * dataW;
      doc.font("Helvetica-Bold").fontSize(8).fillColor(C.heading)
        .text(row.label.toUpperCase(), cx, ty + 10, {
          width: dataW,
          align: "center",
        });
    });

    ty += headerRowH;

    // DATA ROWS
    analyzed.forEach((c, ri) => {
      const bg = ri % 2 === 0 ? C.white : "#f9fafb";
      filledRect(doc, LML, ty, LCW, rowH, bg);
      hLine(doc, LML, ty + rowH, LCW, C.border, 0.4);

      // Candidate Name
      doc.font("Helvetica-Bold").fontSize(9).fillColor(C.heading)
        .text(c.name, LML + 8, ty + (rowH - 11) / 2, {
          width: nameW - 16,
          lineBreak: false,
        });

      doc.save().lineWidth(0.4)
        .moveTo(LML + nameW, ty)
        .lineTo(LML + nameW, ty + rowH)
        .stroke(C.border)
        .restore();

      ROWS.forEach((row, i) => {
        const cx = LML + nameW + i * dataW;

        if (i > 0) {
          doc.save().lineWidth(0.4)
            .moveTo(cx, ty)
            .lineTo(cx, ty + rowH)
            .stroke(C.border)
            .restore();
        }

        const res = c.result;

        if (row.key === "matchScore") {
          const score = res.matchScore ?? 0;
          const sc = score >= 80 ? C.emerald : score >= 60 ? C.amber : C.rose;

          doc.font("Helvetica-Bold").fontSize(12).fillColor(sc)
            .text(score + "%", cx, ty + (rowH - 12) / 2, {
              width: dataW,
              align: "center",
            });

        } else if (row.isCategory) {
          const val = res.categoryScores?.[row.key] ?? 0;

          const barW2 = dataW - 20;
          const barX2 = cx + 10;
          const barY2 = ty + (rowH / 2) - 4;

          roundedRect(doc, barX2, barY2, barW2, 7, 3, C.border);

          const fill2 = Math.max(Math.round(barW2 * val / 100), 2);
          roundedRect(doc, barX2, barY2, fill2, 7, 3, row.color);

          doc.font("Helvetica-Bold").fontSize(7).fillColor(C.heading)
            .text(val + "%", cx, barY2 - 1, {
              width: dataW,
              align: "center",
            });

        } else if (row.key === "verdict") {
          const vd = res.proceedVerdict;

          if (!vd) {
            doc.font("Helvetica").fontSize(9).fillColor(C.muted)
              .text("—", cx, ty + (rowH - 11) / 2, {
                width: dataW,
                align: "center",
              });
            return;
          }

          const vc = verdictColors(vd);

          const pillW = 60;
          const pillX = cx + (dataW - pillW) / 2;
          const pillY = ty + (rowH - 16) / 2;

          roundedRect(doc, pillX, pillY, pillW, 16, 8, vc.bg);
          roundedRect(doc, pillX, pillY, 3, 16, 2, vc.bar);

          doc.font("Helvetica-Bold").fontSize(7).fillColor(vc.text)
            .text(vc.label, pillX + 3, pillY + 4, {
              width: pillW - 3,
              align: "center",
            });
        }
      });

      ty += rowH;
    });

    hLine(doc, LML, ty, LCW, C.border);

    // REASON SECTION 
    const hasAnyReason = analyzed.some((c) => c.result?.proceedReason);

    if (hasAnyReason) {
      ty += 16;

      doc.font("Helvetica-Bold").fontSize(8).fillColor(C.muted)
        .text("HIRING VERDICT REASONS", LML, ty, { characterSpacing: 0.6 });

      ty += 14;

      analyzed.forEach((c) => {
        if (!c.result?.proceedReason) return;

        const vc = verdictColors(c.result.proceedVerdict ?? "Reject");

        const textH = doc.heightOfString(c.result.proceedReason, {
          width: LCW - 28,
          lineGap: 1.5,
        });

        const boxH = textH + 20;

        if (ty + boxH > LH - 40) return;

        roundedRect(doc, LML, ty, LCW, boxH, 5, vc.bg);
        roundedRect(doc, LML, ty, 3, boxH, 2, vc.bar);

        doc.font("Helvetica-Bold").fontSize(8).fillColor(vc.text)
          .text(c.name, LML + 10, ty + 6, { lineBreak: false });

        doc.font("Helvetica").fontSize(9).fillColor(vc.text)
          .text(c.result.proceedReason, LML + 10, ty + 16, {
            width: LCW - 28,
            lineGap: 1.5,
          });

        ty += boxH + 6;
      });
    }

    doc.end();
  });
}