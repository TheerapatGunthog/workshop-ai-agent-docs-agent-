// Workshop นี้บังคับรันผ่าน Docker เท่านั้น เพื่อให้ทุกคนมี environment เหมือนกัน
if (process.env.IN_DOCKER !== "1") {
  console.error(
    "\n[docs-agent-workshop] ต้องรันผ่าน Docker เท่านั้น\n" +
      "  ใช้คำสั่ง: docker compose up --build\n" +
      "  ติดตั้ง package เพิ่ม: docker compose exec frontend npm install <package>\n"
  );
  process.exit(1);
}
