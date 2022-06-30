# Refactoring plan

This files contains a new planed structure of modules in the repo, so they better adhere to SOLID principles and are more testable.

## Tables of module content

Each table represents a module: it's files, types, reasons to change and whether it is done and tested.

> 'The most important step a man can make is the next one.'  
> \- Brandon Sanderson

✅ - done  
❌ - not done  
✅/❌ - in place, but needs changes  
➖ - not needed

&nbsp;

## Auth

---

Note: auth.service.ts still exists as one will be moved from it further on in the refactoring process

| Name                         | Type        | Reson to change                           | Done | Tests |
| :--------------------------- | :---------- | :---------------------------------------- | :--: | :---: |
| auth.controller.ts           | Controller  | Authorization process with HTTP changes   |  ✅  |  ✅   |
| password.service.ts          | Service     | Process of generating password is changed |  ✅  |  ✅   |
| user-validation.service.ts   | Service     | User validation criteria are changed      |  ✅  |  ✅   |
| refresh-token.service.ts     | Service     | Handling of refresh tokens changes        |  ✅  |  ✅   |
| token-parser.service.ts      | Service     | Token parsing is changed or extanded      |  ✅  |  ✅   |
| refresh-token.interceptor.ts | Interceptor | Intercepting refresh tokens               |  ✅  |  ✅   |
| access-token.interceptor.ts  | Interceptor | Intercepting access tokens                |  ✅  |  ✅   |
| ws.guard.ts                  | Guards      | Securing WS connections                   |  ✅  |  ✅   |
| jwt.guard.ts                 | Guards      | Securing JWT tokens                       |  ✅  |  ➖   |
| local.guard.ts               | Guards      | Securing via login info verification      |  ✅  |  ➖   |
| jwt.strategy.ts              | Strategy    | Process of authenticating JWT             |  ✅  |  ➖   |
| local.strategy.ts            | Strategy    | Process of authenticating local data      |  ✅  |  ➖   |

&nbsp;

## Lobby

---

| Name                      | Type       | Reson to change                  | Done | Tests |
| :------------------------ | :--------- | :------------------------------- | :--: | :---: |
| lobby.controller.ts       | Controller | Communication with frontend code |  ✅  |  ❌   |
| lobby-creation.service.ts | Service    | Process of lobby creation        |  ✅  |  ❌   |
| lobby-deleter.service.ts  | Service    | Process of lobby deletion        |  ✅  |  ❌   |
| lobby-search.service.ts   | Service    | Process of lobby search          |  ✅  |  ❌   |

&nbsp;

## Match

---

| Name                           | Type         | Reson to change                        | Done | Tests |
| :----------------------------- | :----------- | :------------------------------------- | :--: | :---: |
| match-management.controller.ts | Controller   | Requests regarding matches             |  ❌  |  ❌   |
| match-creator.service.ts       | Service      | Match creation                         |  ✅  |  ❌   |
| match-deleter.service.ts       | Service      | Match deletion                         |  ❌  |  ❌   |
| match-getter.service.ts        | Service      | Retrieval of matches for frontend code |  ❌  |  ❌   |
| match-updater.service.ts       | Service      | Changes to match object are added      |  ❌  |  ❌   |
| elo.service.ts                 | Service      | Calculation of elo changes             |  ❌  |  ❌   |
| match.gateway.ts               | Gateway      | Comm with client about matche          |  ❌  |  ❌   |
| match.model.ts                 | Model/Schema | Model of match data changes            |  ❌  |  ❌   |

&nbsp;

## Profile

---

| Name                   | Type       | Reson to change                         | Done  | Tests |
| :--------------------- | :--------- | :-------------------------------------- | :---: | :---: |
| profile.controller.ts  | Controller | Changing and recieving data about users | ✅/❌ |  ❌   |
| leaderboard.service.ts | Service    | Leaderboards are defined differently    |  ❌   |  ❌   |
| profile.service.ts     | Service    | Profile data is fetched differently     |  ❌   |  ❌   |

&nbsp;

## User-management

---

| Name                       | Type    | Reson to change               | Done  | Tests |
| :------------------------- | :------ | :---------------------------- | :---: | :---: |
| user-management.service.ts | Service | New needs for user operations | ✅/❌ |  ❌   |

&nbsp;

## Timer

---

| Name             | Type    | Reson to change             | Done  | Tests |
| :--------------- | :------ | :-------------------------- | :---: | :---: |
| timer.service.ts | Service | We count timers differently | ✅/❌ |  ❌   |

&nbsp;

## Redis

---

| Name             | Type    | Reson to change             | Done | Tests |
| :--------------- | :------ | :-------------------------- | :--: | :---: |
| redis.service.ts | Service | We access Redis differently |  ✅  |  ➖   |
