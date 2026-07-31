const role = process.env.SERVICE_ROLE;

if (role === "api") {
  await import("./main.js");
} else if (role === "worker") {
  await import("./worker.js");
} else {
  throw new Error("SERVICE_ROLE must be api or worker");
}
