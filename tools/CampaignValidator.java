import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class CampaignValidator {
  private static int number(String source, String constant) {
    Matcher matcher = Pattern.compile("export const " + constant + " = (\\d+)").matcher(source);
    if (!matcher.find()) throw new IllegalStateException("Missing constant: " + constant);
    return Integer.parseInt(matcher.group(1));
  }

  public static void main(String[] args) throws IOException {
    Path root = Path.of("").toAbsolutePath();
    String catalog = Files.readString(root.resolve("src/game/campaign/LevelCatalog.js"));
    String builder = Files.readString(root.resolve("src/game/campaign/LevelBuilder.js"));
    int total = number(catalog, "TOTAL_LEVELS");
    int perChapter = number(catalog, "LEVELS_PER_CHAPTER");
    int chapterCount = 0;
    Matcher chapters = Pattern.compile("\\{ id: \\\"[^\\\"]+\\\", nameKey:").matcher(catalog);
    while (chapters.find()) chapterCount++;

    if (total <= 0 || perChapter <= 0 || total % perChapter != 0) {
      throw new IllegalStateException("Campaign length must divide evenly into chapters");
    }
    if (chapterCount != total / perChapter) {
      throw new IllegalStateException("Expected " + (total / perChapter) + " chapters, found " + chapterCount);
    }
    Matcher milestones = Pattern.compile("^\\s*(\\d+):", Pattern.MULTILINE).matcher(catalog);
    while (milestones.find()) {
      int level = Integer.parseInt(milestones.group(1));
      if (level < 1 || level > total) throw new IllegalStateException("Invalid part milestone at level " + level);
    }
    if (!builder.contains("mulberry32") || !builder.contains("PATTERNS")) {
      throw new IllegalStateException("Deterministic level builder is missing");
    }

    System.out.printf("Campaign valid: %d levels, %d chapters, boss every %d levels.%n", total, chapterCount, perChapter);
  }
}
