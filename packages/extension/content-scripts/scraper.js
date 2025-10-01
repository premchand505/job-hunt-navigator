// This entire function will be serialized and executed in the target page's context.
async function findAndParseJobDetails() {
    
    // --- HEURISTIC SCORING LOGIC (Unchanged) ---
    function scoreCandidatePanel(element) {
        let score = 0;
        if (!element || typeof element.innerText !== 'string') return 0;
        const textContent = element.innerText.toLowerCase();

        const keywords = ['apply', 'responsibilities', 'qualifications', 'requirements', 'experience', 'salary', 'benefits', 'posted', 'full-time', 'part-time', 'job description'];
        for (const keyword of keywords) {
            if (textContent.includes(keyword)) {
                score += 5;
            }
        }

        if (element.querySelector('h1, h2, [class*="title"], [class*="heading"]')) {
            score += 20;
        }

        const applyButtons = Array.from(element.querySelectorAll('button, a')).filter(el => {
            const buttonText = (el.textContent || "").trim().toLowerCase();
            return buttonText === 'apply' && !buttonText.includes('not now');
        });
        if (applyButtons.length > 0) {
            score += 30;
        }

        const rect = element.getBoundingClientRect();
        if (rect.width > 250 && rect.height > 300) {
            score += 25;
        }

        return score;
    }

    // --- MAIN SCRAPING LOGIC (Final Version) ---
    async function performScraping() {
        const siteConfig = {
            'www.linkedin.com': {
                // Specific selectors to use *after* the panel is found
                title: '.job-details-jobs-unified-top-card__job-title',
                company: '.job-details-jobs-unified-top-card__company-name a',
                location: '.job-details-jobs-unified-top-card__primary-description-without-tagline > span:first-child',
                descriptionContainer: '.jobs-description-content__text'
            },
            'in.indeed.com': {
                region: '.jobsearch-RightPane',
                title: '.jobsearch-JobInfoHeader-title',
                company: '[data-testid="inlineHeader-companyName"]',
                location: '[data-testid="inlineHeader-companyLocation"]',
                descriptionContainer: '#jobDescriptionText'
            }
        };

        await new Promise(resolve => setTimeout(resolve, 2500));
        const hostname = window.location.hostname;
        const selectors = siteConfig[hostname];
        if (!selectors) throw new Error('Unsupported site.');

        let searchContext = document.body;

        if (hostname === 'www.linkedin.com') {
            // --- STAGE 1 (LINKEDIN): Find the broad panel via Content-Based Traversal ---
            const applyButtons = Array.from(document.querySelectorAll('button, a')).filter(el => 
                (el.textContent || "").trim().toLowerCase() === 'apply' && el.offsetParent !== null
            );
            if (applyButtons.length === 0) throw new Error('No "Apply" button found to anchor the search.');

            const mainApplyButton = applyButtons.sort((a,b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width)[0];

            let maxScore = 0;
            let broadPanel = null;
            let currentElement = mainApplyButton.parentElement;
            for (let i = 0; i < 15 && currentElement; i++) { // Traverse up to 15 levels
                const score = scoreCandidatePanel(currentElement);
                if (score > maxScore) {
                    maxScore = score;
                    broadPanel = currentElement;
                }
                currentElement = currentElement.parentElement;
            }
             if (!broadPanel || maxScore < 50) throw new Error('Could not identify a job panel via content-based traversal. Max score: ' + maxScore);
             searchContext = broadPanel; // Set the context for the next stage

        } else if (hostname === 'in.indeed.com') {
            // --- STAGE 1 (INDEED): Find the broad panel via Targeted Heuristics ---
            const regionElement = document.querySelector(selectors.region);
            if (!regionElement) throw new Error(`Could not find the primary job content region ('${selectors.region}') on the page.`);
            searchContext = regionElement;
        }

        if (!searchContext) throw new Error('Failed to identify the main job panel.');

        // --- STAGE 2: Precise Extraction within the identified context ---
        
        const getText = (selector) => {
            const element = searchContext.querySelector(selector);
            return element ? element.innerText.trim() : null;
        };
        const getHtml = (selector) => {
            const element = searchContext.querySelector(selector);
            return element ? element.innerHTML : null;
        };

        const fallbackTitle = searchContext.querySelector('h1, h2');
        const descriptionElement = searchContext.querySelector(selectors.descriptionContainer);

        return {
            title: getText(selectors.title) || (fallbackTitle ? fallbackTitle.innerText.trim() : 'Title not found'),
            company: getText(selectors.company) || 'Company not found',
            location: getText(selectors.location) || 'Location not found',
            descriptionHtml: descriptionElement ? descriptionElement.innerHTML : 'Description not found',
            url: window.location.href,
            status: 'Applied'
        };
    }

    try {
        return await performScraping();
    } catch (e) {
        return { error: e.message };
    }
}

