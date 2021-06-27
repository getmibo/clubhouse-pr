const core = require('@actions/core');
const github = require('@actions/github');
const Clubhouse = require('clubhouse-lib');

/**
 * Finds all clubhouse story IDs in some string content.
 *
 * @param {string} content - content that may contain story IDs.
 * @return {Array} - Clubhouse story IDs 1-7 digit strings.
 */
function extractStoryIds(content) {
  const regex = /(?<=ch|ch-)\d{1,7}/gi;
  const all = content.match(regex);
  const unique = [...new Set(all)];
  return unique;
}

function getStoryIds(pullRequest) {
  core.info(`Branch Name: ${pullRequest.head.ref}`);
  core.info(`PR Title: ${pullRequest.title}`);
  core.info(`PR Body: ${pullRequest.body}`);

  // Look for ch123 or ch-123 in the branch name
  const branchStoryIds = extractStoryIds(pullRequest.head.ref);
  if (branchStoryIds.length) {
    core.info(
      `Found Clubhouse ID(s) in Branch Name: ${branchStoryIds.join(', ')}`
    );
  }

  // Look for ch123 or ch-123 in the PR title
  const prTitleStoryIds = extractStoryIds(pullRequest.title);
  if (prTitleStoryIds.length) {
    core.info(
      `Found Clubhouse ID(s) in PR Title: ${prTitleStoryIds.join(', ')}`
    );
  }

  // Look for ch123 or ch-123 in the PR body
  const prBodyStoryIds = extractStoryIds(pullRequest.body);
  if (prBodyStoryIds.length) {
    core.info(`Found Clubhouse ID(s) in PR Body: ${prBodyStoryIds.join(', ')}`);
  }

  const mainStoryId = [
    ...prTitleStoryIds,
    ...prBodyStoryIds,
    ...branchStoryIds,
  ][0];
  const missingFromPrTitle = [
    ...new Set(
      [...prBodyStoryIds, ...branchStoryIds].filter(
        (x) => !prTitleStoryIds.includes(x)
      )
    ),
  ];

  core.info(`Concluded that main story is: ${mainStoryId}`);
  core.info(
    `Concluded that missing from PR title: ${missingFromPrTitle.join(', ')}`
  );
  return {
    mainStoryId,
    missingFromPrTitle,
  };
}

async function getClubhouseStory(client, storyId) {
  // Even if there's more than one storyId, fetch only first story name:
  try {
    return client
      .getStory(storyId)
      .then((res) => res)
      .catch((err) => err.response);
  } catch (error) {
    return core.setFailed(error);
  }
}

async function updatePullRequest(ghToken, pullRequest, repository, metadata) {
  const octokit = github.getOctokit(ghToken);
  const {
    name: repo,
    owner: { login },
  } = repository;
  const { title, body } = metadata;

  try {
    core.info(`Updating Title: ${title}`);
    return await octokit.pulls.update({
      repo,
      owner: login,
      pull_number: pullRequest.number,
      title,
      body,
    });
  } catch (error) {
    return core.setFailed(error);
  }
}

async function addLabels(ghToken, pullRequest, repository, metadata) {
  const octokit = github.getOctokit(ghToken);
  const {
    name: repo,
    owner: { login },
  } = repository;
  const { labels } = metadata;

  try {
    core.info(`Updating labels: ${labels}`);
    return await octokit.issues.addLabels({
      repo,
      owner: login,
      issue_number: pullRequest.number,
      labels,
    });
  } catch (error) {
    return core.setFailed(error);
  }
}

function generatePrTitle(storyIds, story, prTitle) {
  const formattedStoryIds = storyIds.map((id) => `[ch-${id}]`).join(' ');
  const basePrTitle = prTitle === '-' ? story.name : prTitle;
  const newTitle = `${basePrTitle} ${formattedStoryIds}`.trim();
  return newTitle;
}

function generatePrBody(prBody) {
  const regexp = /(?<!\[)(ch-?\d{1,7})(?!\])/gi;
  return prBody.replace(regexp, '[$1]');
}

async function fetchStoryAndUpdatePr(params) {
  const { ghToken, chToken, pullRequest, repository, dryRun } = params;
  const storyIds = getStoryIds(pullRequest);
  if (!storyIds.mainStoryId) {
    // No stories found at all
    core.info('No Clubhouse ID(s) found');
    return pullRequest.title;
  }

  const client = Clubhouse.create(chToken);
  const mainStory = await getClubhouseStory(client, storyIds.mainStoryId);
  const newTitle = generatePrTitle(
    storyIds.missingFromPrTitle,
    mainStory,
    pullRequest.title
  );
  const newBody = generatePrBody(pullRequest.body);

  if (!dryRun) {
    await updatePullRequest(ghToken, pullRequest, repository, {
      title: newTitle,
      body: newBody,
    });
    await addLabels(ghToken, pullRequest, repository, {
      labels: [mainStory.story_type],
    });
  }

  return newTitle;
}

async function run() {
  try {
    const ghToken = core.getInput('ghToken');
    const chToken = core.getInput('chToken');

    if (!ghToken) {
      return core.setFailed('Input ghToken is required.');
    }

    if (!chToken) {
      return core.setFailed('Input chToken is required.');
    }

    // Mask tokens:
    core.setSecret('ghToken');
    core.setSecret('chToken');

    const { pull_request: pullRequest, repository } = github.context.payload;
    await fetchStoryAndUpdatePr({
      ghToken,
      chToken,
      pullRequest,
      repository,
      dryRun: false,
    });

    return {};
  } catch (error) {
    return core.setFailed(error.message);
  }
}

// Always true in the actions env
if (process.env.GITHUB_ACTIONS) {
  run();
}

export {
  extractStoryIds,
  getStoryIds,
  getClubhouseStory,
  generatePrTitle,
  generatePrBody,
  fetchStoryAndUpdatePr,
  run,
};
