export async function fetchGitHubContext(username: string): Promise<string> {
  if (!username || username.trim() === '') return '';
  
  try {
    const reposRes = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=5`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'AI-Interviewer'
      }
    });

    if (!reposRes.ok) {
      if (reposRes.status === 404) return `GitHub user ${username} not found.`;
      return `Failed to fetch GitHub repos for ${username}.`;
    }

    const repos = await reposRes.json();
    if (!Array.isArray(repos) || repos.length === 0) {
      return `GitHub user ${username} has no public repositories.`;
    }

    let context = `GitHub Context for ${username}:\n\n`;

    // Extract basic info for top 5 repos
    for (const repo of repos) {
      context += `- Repository: ${repo.name}\n`;
      context += `  Primary Language: ${repo.language || 'Unknown'}\n`;
      context += `  Description: ${repo.description || 'No description'}\n`;
      context += `  Stars: ${repo.stargazers_count}\n`;
    }

    context += `\nDetailed Readmes for top 2 repos:\n`;

    // Fetch Readme for top 2 repos
    const topRepos = repos.slice(0, 2);
    for (const repo of topRepos) {
      const readmeRes = await fetch(`https://api.github.com/repos/${username}/${repo.name}/readme`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'AI-Interviewer'
        }
      });

      if (readmeRes.ok) {
        const readmeData = await readmeRes.json();
        if (readmeData.content) {
          const decoded = Buffer.from(readmeData.content, 'base64').toString('utf-8');
          const truncated = decoded.slice(0, 500) + (decoded.length > 500 ? '...' : '');
          context += `\n--- README: ${repo.name} ---\n${truncated}\n`;
        }
      }
    }

    return context;
  } catch (err) {
    console.error("GitHub fetch error:", err);
    return `Error fetching GitHub context.`;
  }
}
