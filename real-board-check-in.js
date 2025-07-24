/**
 * Checkin and checkout of workplace in real-bord system.
 *
 */

const baseUrl = 'https://api.real-board.com/api';

if(!window["setGlobal"]){
    setGlobal = (name,value)=> console.log(`Setting global variable %${name} to ${value}`);
    exit = () => console.log("Exiting...");
    local = () => "1";
}



(async ()=> {
    if (process.argv.length < 4) {
        throw new Error('Missing parameters. Expected: <ccid> <username> <password> <action>');
    }
    const ccid = Number.parseInt(local('ccid'));
    const username = local('username');
    const password = local('password');
    const action = local('par1');

    /**
     *
     * @returns {Promise<{callResult?: object, error?: string, errorMsgs?: string[]}>}
     */
    const post = async (url, body, accessToken) => {
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
    const login = async () => {
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
        const res = await post(baseUrl + '/servicecall', body, null);
        if (res.error) {
            throw new Error(`Login fail: ` + res.error);
        }
        return res.callResult.callResult.userInfo.accessToken;

    }

    const punchIn = async () => {
        const body = {
            latitude: 31.9025936,
            longitude: 34.7906387,
            attendSpecialEventId: 0,
            accuracy: 3011.0486503376574,
            isHealthDeclarationFilledForToday: true,
            timeZone: 3,
            additionalEmployeeId: 12
        };
        const accessToken = await login();
        const res = await post(baseUrl + '/Portal/employee/punchin', body, accessToken);
        if (res.error) {
            if (res.errorMsgs) {
                if (res.errorMsgs.includes('הדיווח נקלט בהצלחה ויוצג בהמשך בדו״ח הנוכחות')) {
                    throw new Error("You're already punched-in.");
                }
            }
            throw new Error('Punch-in failed.');
        }
    }

    const punchOut = async () => {
        const body = {
            latitude: 31.9025936,
            longitude: 34.7906387,
            attendSpecialEventId: 0,
            accuracy: 3011.0486503376574,
            timeZone: 3,
            additionalEmployeeId: 12
        };
        const accessToken = await login();
        const res = await post(baseUrl + '/Portal/employee/punchout', body, accessToken);
        if (res.error) {
            if (res.errorMsgs) {
                if (res.errorMsgs.includes('הדיווח נקלט בהצלחה ויוצג בהמשך בדו״ח הנוכחות')) {
                    throw new Error("You're already punched-out.");
                }
            }
            throw new Error('Punch-out failed');
        }
    }



    if (action === 'punchin') {
        await punchIn();
    } else if (action === 'punchout') {
        await punchOut();
    }
})()
    .then(() => {
        exit();
    })
    .catch(e => {
        setGlobal("errormsg", e.message || e)
        exit(1);
    });
