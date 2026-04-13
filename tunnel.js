const fs = require("fs");
const localtunnel = require("localtunnel");

async function start() {
  try {
    const tunnel = await localtunnel({ port: 3000 });
    fs.writeFileSync("public-url.txt", tunnel.url, "utf8");
    console.log(`Public URL: ${tunnel.url}`);

    tunnel.on("close", () => {
      process.exit(0);
    });
  } catch (error) {
    fs.writeFileSync("public-url.txt", `ERROR: ${error.message}`, "utf8");
    console.error(error);
    process.exit(1);
  }
}

start();
