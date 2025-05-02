const GITHUB_USERNAME = ''; // Ditt användarnamn
const GITHUB_TOKEN = ''; // Din token (OBS: hantera säkert!) För access till dina privata repos - se till att din token har rätt behörigheter.
const API_URL = `https://api.github.com`;

// DOM-element
const loader = document.querySelector('.loading');
const summary = document.querySelector('.summary');
const alertDetails = document.querySelector('.alert-details-list');
const alertList = document.querySelector('.alert-list');

//Variabler
const unactivated = [];
const activated = [];
let activeAlerts = 0;
const alertDetailsObj = {};

//Hämta alla repos
async function getRepos(username) {
  const res = await fetch(`${API_URL}/users/${username}/repos?per_page=100`, {
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
    },
  });
  if (!res.ok) {
    console.error('Fel vid hämtning av repos:', await res.text());
    return [];
  }
  return await res.json();
}

// Hämta alla alerts för enskilt repo
async function getAlerts(repo) {
  const res = await fetch(
    `${API_URL}/repos/${repo.full_name}/dependabot/alerts?state=open`,
    {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
      },
    }
  );
  if (res.status === 404) {
    unactivated.push(repo.full_name);
    return [];
  } else if (!res.ok) {
    unactivated.push(repo.full_name);
    return [];
  } else {
    activated.push(repo.full_name);
    const alerts = await res.json();
    return alerts.map((alert) => ({
      repo: repo.name,
      dependency: alert.dependency?.package?.name,
      severity: alert.security_advisory?.severity,
      summary: alert.security_advisory?.summary,
      ghsa_id: alert.security_advisory?.ghsa_id,
      url: alert.html_url,
    }));
  }
}

// Async funktion för att hämta och visa alerts - körs när sidan laddas
(async () => {
  // Ladd-animation
  loader.style.display = 'flex';
  // Hämta repos
  const repos = await getRepos(GITHUB_USERNAME);
  // Loopa genom repos
  for (const repo of repos) {
    // Hämta alerts för repo
    const alerts = await getAlerts(repo);
    if (alerts.length > 0) {
      // Om alerts finns, lägg till antal i activeAlerts och sätt heading
      activeAlerts += alerts.length;
      const heading = document.createElement('h3');
      heading.innerHTML = `${repo.full_name}`;
      alertList.appendChild(heading);
      // Loopa genom alerts
      alerts.forEach((a) => {
        //Kolla om alerten redan finns i alertDetailsObj, i så fall lägg till repo, annars lägg till alert.
        const id = a.ghsa_id;
        if (!alertDetailsObj[id]) {
          alertDetailsObj[id] = {
            summary: a.summary,
            severity: a.severity,
            dependency: a.dependency,
            repos: [repo.name],
            url: a.url,
          };
        } else {
          alertDetailsObj[id].repos.push(repo.name);
        }
        //Sätt HTML för alert
        setAlertItemsHTML(a);
      });
    }
  }

  setAlertDetailsHTML();
  setUnactivatedHTML();
  setSummaryDetailsHTML();

  //När allt är sätt, göm loader
  loader.style.display = 'none';
})();

// Funktioner för att uppdatera HTML
function setAlertItemsHTML(a) {
  const alertItem = document.createElement('li');
  alertItem.className = 'alert-item';
  alertItem.innerHTML = `
  <ul>
    <li><strong>Dependency:</strong> ${a.dependency}</li>
    <li><strong>Severity:</strong> <span class=${a.severity}>${a.severity}</span></li>
    <li><strong>Summary:</strong> ${a.summary}</li>
    <li><strong>GHSA ID:</strong> ${a.ghsa_id}</li>
    <li><strong>URL:</strong><a href=${a.url} target="_blank"> ${a.url}</a></li>
  </ul>
  <hr></hr>`;
  alertList.appendChild(alertItem);
}

function setSummaryDetailsHTML() {
  summary.innerHTML = `
    <h2>🔍 Sammanfattning</h2>
    <h4>Aktiverade repos:${activated.length} </h4>
    <h4>Inaktiverade repos: ${unactivated.length} </h4>
    <h4>Totalt antal aktiva alerts: ${activeAlerts}</h4>`;
}

function setAlertDetailsHTML() {
  Object.entries(alertDetailsObj).forEach(([ghsa_id, details]) => {
    const alertDetailsItem = document.createElement('li');
    alertDetailsItem.className = 'alert-details-item';
    alertDetailsItem.innerHTML = `<h3> ${[ghsa_id]} </h3>
    <ul>
      <li><strong>Repos:</strong> ${details.repos.join(', ')}</li>
      <li><strong>Dependency:</strong> ${details.dependency}</li>
      <li><strong>Severity:</strong> <span class=${details.severity}>${
      details.severity
    }</span></li>
      <li><strong>Summary:</strong> ${details.summary}</li>
    </ul>
    <hr></hr>`;
    alertDetails.appendChild(alertDetailsItem);
  });
}

function setUnactivatedHTML() {
  const unactivatedList = document.querySelector('.unactivated-list');
  unactivated.forEach((repo) => {
    const unactivatedItem = document.createElement('li');
    unactivatedItem.className = 'unactivated-item';
    unactivatedItem.innerHTML = `${repo}`;
    unactivatedList.appendChild(unactivatedItem);
  });
}
