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