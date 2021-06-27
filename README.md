# ClubHouse Pull Request Github Action

This Action does 3 things:

- Puts all Clubhouse stories mentioned in the branch name and PR body in the PR title
- It labels the PR with the story type in Clubhouse (of the first detected story)
- When you open a PR with `-` as the title it will replace it with the Clubhouse story title

## Why?

Because we use [release-drafter](https://github.com/release-drafter/release-drafter) to draft release notes based on the PR titles and labels.

By labeling the PR we can categorize our PRs. By mentioning the Clubhouse tickets in the release notes we create a link between the release and the Clubhouse ticket, also we can move tickets automatically when the release is published using [clubhouse-workflow-action](https://github.com/getmibo/clubhouse-workflow-action).

## Inputs

### `ghToken`

**Required** GITHUB_TOKEN

### `chToken`

**Required** Clubhouse API Token

**Default** `true`

## Development

Run `yarn tdd` to watch Jest tests as you make your changes.

Run `yarn lint:watch` to watch for ESLint errors/warnings.

**Note**: Always run `yarn build` before pushing any changes.

## Example usage

Note: This is for use when _opening_ a pull request.

```
on:
  pull_request:
    types: [opened]
```

```
uses: getmibo/clubhouse-pr@master
with:
  ghToken: ${{ secrets.GITHUB_TOKEN }}
  chToken: ${{ secrets.CLUBHOUSE_API_TOKEN }}
```

## Example Transformations

The below assumes we are working on a Clubhouse story with the following parameters

Name: `A cool new feature`

Story Type: `feature`

Story ID: `56789`

### Using the clubhouse story name for a PR title

#### A PR Opened As...

**Title**

```
ch
```

**Body**

```
- We did a thing
- Another thing
- Yay feature
```

#### Is updated to...

**Title**

```
(feature) A cool new feature [ch56789]
```

**Body**

```
Story details: https://app.clubhouse.io/farmersdog/story/56789

- We did a thing
- Another thing
- Yay feature
```

### Using a custom PR title (aka don't use the story name)

#### A PR Opened As...

**Title**

```
We ended up not needing the cool new feature, tweaked a thing instead
```

**Body**

```
- This was an easy one, not much to say
```

#### Is updated to...

**Title**

```
(feature) We ended up not needing this, tweaked a thing instead [ch56789]
```

**Body**

```
Story details: https://app.clubhouse.io/farmersdog/story/56789

- This was an easy one, not much to say
```
