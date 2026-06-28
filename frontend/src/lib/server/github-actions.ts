// Déclenche un workflow GitHub Actions (workflow_dispatch) à distance.
// Remplace le spawn de sous-processus local (qui ne fonctionne pas sur
// Vercel, serverless — aucun Python disponible) : le worker d'envoi et le
// scraping tournent réellement sur les runners GitHub, gratuitement.
export async function declencherWorkflow(
  workflowFile: string,
  inputs: Record<string, string>
): Promise<void> {
  const token = process.env.GITHUB_ACTIONS_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (!token || !repo) {
    throw new Error("GITHUB_ACTIONS_TOKEN / GITHUB_REPO non configurés.");
  }

  const response = await fetch(
    `https://api.github.com/repos/${repo}/actions/workflows/${workflowFile}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref: "main", inputs }),
    }
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`GitHub Actions a refusé le déclenchement (${response.status}) : ${body}`);
  }
}
