document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const fd = new FormData(form);

    // Build a readable text file
    const lines = [];
    lines.push("DFW Smart Solutions — Quote Request");
    lines.push(`Timestamp: ${new Date().toISOString()}`);
    lines.push("----");

    for (const [key, value] of fd.entries()) {
      lines.push(`${key}: ${value}`);
    }

    lines.push("----");
    const text = lines.join("\n");

    // Create a downloadable file in the browser
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    const stamp = new Date().toISOString().replaceAll(":", "-");
    a.href = url;
    a.download = `dfw_quote_${stamp}.txt`;

    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);

    // Optional: still log so you can sanity-check
    console.log("Saved quote file:", a.download);
  });
});
