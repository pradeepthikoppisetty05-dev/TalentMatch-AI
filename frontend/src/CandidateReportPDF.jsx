import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 11,
    fontFamily: "Helvetica",
    backgroundColor: "#f8fafc",
  },
  header: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: "#2563eb",
    color: "white",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
  },
  scoreBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#e0f2fe",
    borderRadius: 4,
  },
  section: {
    marginTop: 15,
    padding: 10,
    backgroundColor: "white",
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 14,
    marginBottom: 6,
    fontWeight: "bold",
    color: "#1e293b",
  },
  listItem: {
    marginBottom: 4,
  },
  skillRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    borderBottom: "1px solid #e2e8f0",
  },
  skillName: {
    fontWeight: "bold",
  },
  skillLevel: {
    color: "#2563eb",
  },
});

export function CandidateReportPDF({ result }) {
  console.log(result);


  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Candidate Analysis Report</Text>
        </View>

        {/* Score */}
        <View style={styles.scoreBox}>
          <Text>Match Score: {result.matchScore}%</Text>
        </View>

        {/* Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <Text>{result.summary}</Text>
        </View>

        {/* Strengths */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Strengths</Text>
          {result.strengths.map((s, i) => (
            <Text key={i} style={styles.listItem}>• {s}</Text>
          ))}
        </View>

        {/* Gaps */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Skill Gaps</Text>
          {result.gaps.map((g, i) => (
            <Text key={i} style={styles.listItem}>• {g}</Text>
          ))}
        </View>

        {/* Skills Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Technical Skills</Text>
          {result.technicalSkillsMatch.map((skill, i) => (
            <View key={i} style={styles.skillRow}>
              <Text style={styles.skillName}>{skill.skill}</Text>
              <Text style={styles.skillLevel}>{skill.level}</Text>
            </View>
          ))}
        </View>

        {/* Recommendations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommendations</Text>
          {result.recommendations.map((rec, i) => (
            <Text key={i} style={styles.listItem}>• {rec}</Text>
          ))}
        </View>

        {/* Interview Questions */}
        
        {result?.customQuestions?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Interview Questions</Text>

            {result.customQuestions.map((q, i) => (
              <View key={q.id} style={{ marginBottom: 8 }}>
                <Text>{i + 1}. {q.question}</Text>

                {q.answer && (
                  <Text>Answer: {q.answer}</Text>
                )}

                {q.rating > 0 && (
                  <Text>Rating: {q.rating}/5</Text>
                )}
              </View>
            ))}
          </View>
        )}
        {result?.averageRating && (
          <View style={styles.scoreBox}>
            <Text>Average Interview Rating: {result.averageRating} / 5</Text>
          </View>
        )}

  

      </Page>
    </Document>
  );
}
