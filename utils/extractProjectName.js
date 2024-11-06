const extractProjectName = (repoUrl) => {
  // Extract the last part of the URL after the last '/'
  const lastSegment = repoUrl.split("/").pop();

  // Remove the .git suffix if it exists
  const directoryName = lastSegment.endsWith(".git") ? lastSegment.slice(0, -4) : lastSegment;

  return directoryName;
};

module.exports = extractProjectName;
