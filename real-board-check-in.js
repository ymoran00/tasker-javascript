const baseUrl = 'https://api.real-board.com/api';


/**
 *
 * @param ccid
 * @param url
 * @param body
 * @param accessToken
 * @returns {Promise<{callResult?: object, error?: string, errorMsgs?: string[]}>}
 */
async function post(ccid, url, body, accessToken) {
    const resp = await fetch(url, {
        method: 'POST',
        body: body ? JSON.stringify(body) : {},
        headers: {
            'Content-Type': 'application/json',
            'customercode': ccid,
            'accesstoken': accessToken,
        },
    });
    if (resp.ok) {
        const json = await resp.json();
        const callResult = json.calls[0];
        if (callResult.isSuccess === false) {
            const msgs = callResult.msgs ? callResult.msgs.msgs || [] : [];
            const errMessages = msgs.map(m => m.message);
            console.error(`POST ${url} failed`);
            console.debug(JSON.stringify(callResult, undefined, 4));
            return {error: 'Error is response', errorMsgs: errMessages, callResult};
        }
        return {callResult};
    } else {
        return {error: 'POST call failed'};
    }
}

/**
 @returns {Promise<string>} accessToken if successful
 */
async function login(ccid, username, password) {
    const body = {
        calls: [{
            methodName: "login",
            parameters: {
                userId: username,
                pw: password,
                customerCode: ccid,
                sourceCode: "PORTAL",
                isMobileApp: null
            }
        }]
    };
    const res = await post(ccid, baseUrl + '/servicecall', body, null);
    if (res.error) {
        throw new Error(`Login fail: ` + res.error);
    }
    return res.callResult.callResult.userInfo.accessToken;

}

async function punchIn(ccid, username, password) {
    const body = {
        latitude: 31.9025936,
        longitude: 34.7906387,
        attendSpecialEventId: 0,
        accuracy: 3011.0486503376574,
        isHealthDeclarationFilledForToday: true,
        timeZone: 3,
        additionalEmployeeId: 12
    };
    const accessToken = await login(ccid, username, password);
    const res = await post(ccid, baseUrl + '/Portal/employee/punchin', body, accessToken);
    if (res.error) {
        if (res.errorMsgs) {
            if (res.errorMsgs.includes('הדיווח נקלט בהצלחה ויוצג בהמשך בדו״ח הנוכחות')) {
                throw new Error("You're already punched-in.");
            }
        }
        throw new Error('Punch-in failed.');
    }
}

async function punchOut(ccid, username, password) {
    const body = {
        latitude: 31.9025936,
        longitude: 34.7906387,
        attendSpecialEventId: 0,
        accuracy: 3011.0486503376574,
        timeZone: 3,
        additionalEmployeeId: 12
    };
    const accessToken = await login(ccid, username, password);
    const res = await post(ccid, baseUrl + '/Portal/employee/punchout', body, accessToken);
    if (res.error) {
        if (res.errorMsgs) {
            if (res.errorMsgs.includes('הדיווח נקלט בהצלחה ויוצג בהמשך בדו״ח הנוכחות')) {
                throw new Error("You're already punched-out.");
            }
        }
        throw new Error('Punch-out failed');
    }
}


// To return a custom HTTP response, use $.respond() [requires HTTP trigger]
async function main() {
    if (process.argv.length < 4) {
        throw new Error('Missing parameters. Expected: <ccid> <username> <password> <action>');
    }
    const ccid = Number.parseInt(process.argv[0]);
    const username = process.argv[1];
    const password = process.argv[2];
    const action = process.argv[3];

    if (action === 'punchin') {
        await punchIn(ccid, username, password);
    } else if (action === 'punchout') {
        await punchOut(ccid, username, password);
    }
}

main()
    .then(() => {
        console.log('Success');
        process.exit(0);
    })
    .catch(e => {
        console.log(e.message || e);
        process.exit(1);
    });
