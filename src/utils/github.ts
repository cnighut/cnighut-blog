const GITHUB_USERNAME = "cnighut";
const GITHUB_TOKEN = import.meta.env.GITHUB_TOKEN;

interface GitHubPR {
	number: number;
	title: string;
	state: string;
	pull_request?: {
		merged_at: string | null;
	};
	created_at: string;
	closed_at: string | null;
	html_url: string;
	repository_url: string;
}

interface GitHubReview {
	id: number;
	body: string;
	html_url: string;
	pull_request_url: string;
	submitted_at: string;
	state: string;
	user?: {
		login: string;
	};
}

export interface Contribution {
	number: number;
	title: string;
	status: "merged" | "open" | "closed";
	date: string;
	url: string;
	repo: string;
	repoUrl: string;
}

export interface RepoContribution {
	repo: string;
	repoUrl: string;
	owner: string;
	description: string | null;
	stars: number;
	prs: Contribution[];
	reviewComments: ReviewComment[];
}

export interface ReviewComment {
	id: number;
	body: string;
	url: string;
	prNumber: number;
	prTitle: string;
	date: string;
	state: string;
}

async function githubFetch<T>(url: string): Promise<T> {
	const headers: Record<string, string> = {
		Accept: "application/vnd.github.v3+json",
		"User-Agent": "cnighut-blog",
	};

	if (GITHUB_TOKEN) {
		headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
	}

	const response = await fetch(url, { headers });

	if (!response.ok) {
		throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
	}

	return response.json();
}

function formatDate(dateStr: string): string {
	return new Date(dateStr).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function extractRepoFromUrl(url: string): { owner: string; repo: string } {
	const match = url.match(/repos\/([^/]+)\/([^/]+)/);
	if (!match) return { owner: "", repo: "" };
	return { owner: match[1], repo: match[2] };
}

export async function getAuthoredPRs(): Promise<Contribution[]> {
	try {
		const data = await githubFetch<{ items: GitHubPR[] }>(
			`https://api.github.com/search/issues?q=author:${GITHUB_USERNAME}+type:pr&sort=created&order=desc&per_page=100`
		);

		const contributions: Contribution[] = [];

		for (const pr of data.items) {
			const { owner, repo } = extractRepoFromUrl(pr.repository_url);
			
			let status: "merged" | "open" | "closed";
			if (pr.pull_request?.merged_at) {
				status = "merged";
			} else if (pr.state === "open") {
				status = "open";
			} else {
				status = "closed";
			}

			contributions.push({
				number: pr.number,
				title: pr.title,
				status,
				date: formatDate(pr.pull_request?.merged_at || pr.closed_at || pr.created_at),
				url: pr.html_url,
				repo: `${owner}/${repo}`,
				repoUrl: `https://github.com/${owner}/${repo}`,
			});
		}

		contributions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

		return contributions;
	} catch (error) {
		console.warn("Failed to fetch PRs from GitHub:", error);
		return [];
	}
}

export async function getReviewComments(): Promise<ReviewComment[]> {
	try {
		const searchUrl = `https://api.github.com/search/issues?q=commenter:${GITHUB_USERNAME}+type:pr+-author:${GITHUB_USERNAME}+-user:${GITHUB_USERNAME}&sort=updated&order=desc&per_page=10`;

		const data = await githubFetch<{ items: GitHubPR[] }>(searchUrl);
		const comments: ReviewComment[] = [];

		for (const pr of data.items.slice(0, 5)) {
			const { owner, repo } = extractRepoFromUrl(pr.repository_url);
			const reviewsUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${pr.number}/reviews`;

			try {
				const reviews = await githubFetch<GitHubReview[]>(reviewsUrl);
				const userReviews = reviews.filter(
					(r) => r.user?.login === GITHUB_USERNAME && r.body && r.body.trim().length > 0
				);

				for (const review of userReviews) {
					comments.push({
						id: review.id,
						body: review.body.length > 150 ? review.body.slice(0, 150) + "..." : review.body,
						url: review.html_url,
						prNumber: pr.number,
						prTitle: pr.title,
						date: formatDate(review.submitted_at),
						state: review.state,
					});
				}
			} catch {
				// Skip if we can't fetch reviews for this PR
			}
		}

		return comments;
	} catch (error) {
		console.warn("Failed to fetch review comments from GitHub:", error);
		return [];
	}
}

const KNOWN_REPOS: Record<string, { description: string; stars: number }> = {
	"abhigyanpatwari/GitNexus": {
		description: "Code knowledge graph tool for understanding and navigating codebases",
		stars: 19845,
	},
	"numpy/numpy": {
		description: "The fundamental package for scientific computing with Python",
		stars: 29200,
	},
	"internetarchive/openlibrary": {
		description: "One webpage for every book ever published!",
		stars: 6288,
	},
};

export async function getContributionsByRepo(): Promise<RepoContribution[]> {
	const prs = await getAuthoredPRs();

	const repoMap = new Map<string, RepoContribution>();
	const excludedRepos = new Set<string>();

	for (const pr of prs) {
		const [owner] = pr.repo.split("/");

		if (owner === GITHUB_USERNAME) {
			continue;
		}

		if (excludedRepos.has(pr.repo)) {
			continue;
		}

		if (!repoMap.has(pr.repo)) {
			let description: string | null = null;
			let stars = 0;

			if (KNOWN_REPOS[pr.repo]) {
				description = KNOWN_REPOS[pr.repo].description;
				stars = KNOWN_REPOS[pr.repo].stars;
			} else {
				try {
					const repoData = await githubFetch<{ description: string | null; stargazers_count: number }>(
						`https://api.github.com/repos/${pr.repo}`
					);
					description = repoData.description;
					stars = repoData.stargazers_count;
				} catch {
					excludedRepos.add(pr.repo);
					continue;
				}
			}

			if (stars < 20) {
				excludedRepos.add(pr.repo);
				continue;
			}

			repoMap.set(pr.repo, {
				repo: pr.repo,
				repoUrl: pr.repoUrl,
				owner,
				description,
				stars,
				prs: [],
				reviewComments: [],
			});
		}

		repoMap.get(pr.repo)!.prs.push(pr);
	}

	const contributions = Array.from(repoMap.values());
	// Sort by most recent PR date
	contributions.sort((a, b) => {
		const aDate = a.prs[0] ? new Date(a.prs[0].date).getTime() : 0;
		const bDate = b.prs[0] ? new Date(b.prs[0].date).getTime() : 0;
		return bDate - aDate;
	});

	return contributions;
}

export async function getAllContributions(): Promise<{
	repos: RepoContribution[];
	totalPRs: number;
	totalMerged: number;
	reviewComments: ReviewComment[];
}> {
	const [repos, reviewComments] = await Promise.all([
		getContributionsByRepo(),
		getReviewComments(),
	]);

	const totalPRs = repos.reduce((sum, r) => sum + r.prs.length, 0);
	const totalMerged = repos.reduce(
		(sum, r) => sum + r.prs.filter((p) => p.status === "merged").length,
		0
	);

	return {
		repos,
		totalPRs,
		totalMerged,
		reviewComments,
	};
}
