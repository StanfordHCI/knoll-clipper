import { sendMessage } from "webext-bridge";
import { Tabs } from "webextension-polyfill";
import browser from "webextension-polyfill";
import constants from '~/services/constants'; 
import moduleServices from '~/services/moduleServices';
import userServices from '~/services/userServices';
import gptServices from '~/services/gptServices';
import { parseTweet } from "~/background/utils";

interface Cache {
  [key: any]: any;
}

const saveModules = async(request:any) => {
  const knowledge = await moduleServices.updateKnowledge(request.data.checked, request.data.modules)
    if (knowledge && knowledge["response"]) {
      const response = JSON.parse(knowledge["response"]) // parse the stringified response
      console.log("response", response)
      let knowledgeDict:any = {}

      Object.keys(response).forEach((key) => {
        const subKnowledge = response[key].knowledge.knowledge // will be undefined for markdown files
        knowledgeDict[key] = {
          knowledge: subKnowledge ? subKnowledge.join("\n") : response[key].knowledge,
          link: response[key].link,
          name: response[key].name
        }
      })


      browser.storage.local.set({"knowledge": knowledgeDict}).then(() => {
        console.log("Value is set", knowledgeDict);
        return new Promise((resolve, reject) => {
          resolve(null)
        })
      });
    }
}

// only on dev mode
if (import.meta.hot) {
  // @ts-expect-error for background HMR
  import("/@vite/client");
  // load latest content script
  import("./contentScriptHMR");
}

browser.runtime.onInstalled.addListener(({ reason }): void => {
  console.log('Extension installed')
  browser.contextMenus.create({
    id: "clipSelectedText",
    title: "Clip Selected Text",
    contexts: ["selection"]
  });
  if (reason === 'install') {
    const today = new Date(); // Get the current date
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(today.getDate() + 7); 
    const oneWeekISO = oneWeekFromNow.toISOString();
    console.log('One week from now', oneWeekISO)
    browser.storage.local.set({showSurveyDate: oneWeekISO });

    browser.tabs.update({
      url: `${constants.URL}/download`,
    })
  }
})


// listen for messages from web app
browser.runtime.onMessageExternal.addListener(async (message, sender, sendResponse) => {
  console.log("Message", message)
  if (message.type === 'sign_in') {
    console.log('Sign in 2', message.user)
    await browser.storage.sync.set({"uid": message.user})
  } else if (message.type === 'sign_out') {
    console.log('Sign out')
    await browser.storage.sync.remove("uid")
  } else if (message.type === 'check_exists') {
    sendResponse({exists: true})
  } else if (message.type === 'save') {
    console.log('Save', message)
    saveModules(message)
    .then(response => {
      sendResponse({success: true})
    })
    .catch(error => {
      sendResponse({success: false})
    })
  }
  return true
});

browser.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  console.log('request in background', request)
  if (request.type === 'save_module') {
    saveModules(request)
  } else if (request.type === 'popup_open') {
    console.log('Open Popup')
    
    // Check if data is stored in cache before calliing API
      return new Promise((resolve, reject) => {
        moduleServices
          .fetchModules(request.data)
          .then((response) => {
            resolve(response)
          })
          .catch((error) => {
            console.error(error)
            resolve({success: false, response: {modules: []}});
          });
      });
  } else if (request.type === 'add_module') {
      console.log('Add Module', request.data)    
      return new Promise((resolve, reject) => {
        userServices
          .addUserModule(request.data)
          .then((response) => {
            resolve(response)
          })
          .catch((error) => {
            console.error(error)
            resolve({});
          });
      });
  }
  else if (request.type === 'sign_in') {
      console.log("open sign in")
      browser.tabs.create({ url: `${constants.URL}/login` });
      return new Promise((resolve, reject) => {
        resolve(null)
      })
  }
  else if (request.type === 'sign_up') {
    console.log("open sign in")
    browser.tabs.create({ url: `${constants.URL}/signup` });
    return new Promise((resolve, reject) => {
      resolve(null)
    })
  }
  else if (request.type === 'guest_sign_up') {
    browser.tabs.create({ url: `${constants.URL}/guest` });
    return new Promise((resolve, reject) => {
      resolve(null)
    })
  } else if (request.type === 'add_content') {
    console.log("Add content")
    return new Promise((resolve, reject) => {
      moduleServices
      .addContent(request.data)
      .then((response) => {
        resolve(response)
      })
      .catch((error) => {
        console.error(error)
        resolve({})
      })
    })
  } else if (request.type === 'get_tweet') {
    console.log('Get Tweet', request.data)
    if (request.data) {
      const tweet = request.data?.response 
      const parsedTweet = parseTweet(tweet)
      console.log('Parsed Tweet', parsedTweet)
      if (!parsedTweet.isError) {
        console.log(JSON.stringify(parsedTweet.tweetThread))
        browser.storage.local.set({"tweetInfo": JSON.stringify(parsedTweet.tweetThread)}).then(() => {
          return new Promise((resolve, reject) => {
            resolve(null)
          })
        });
      }
    }
    return new Promise((resolve, reject) => {
      resolve(null)
    })
  }
});

// handle browser menu clicks
browser.contextMenus.onClicked.addListener(function(info, tab) {
  if (info.menuItemId === "clipSelectedText") {
    const selectedText = info.selectionText;
    browser.storage.local.set({"clipped": selectedText}).then(() => {
      return new Promise((resolve, reject) => {
        resolve(null)
      })
    });
    browser.action.openPopup();

  }
});

 // let storedData:Cache = {}
    // browser.storage.local.get(['modules', 'communities']).then((result) => {
    //   storedData = result
    // })
    
    // console.log('Stored Data', storedData, storedData.modules, storedData.communities)
    // // Check which endpoints to call depending on what is in the cache
    // if (storedData.modules && storedData.communities) {
    //   return new Promise((resolve, reject) => {
    //     const returnData:any = {modules: storedData.modules, communities: storedData.communities}
    //     resolve(returnData);
    //   })
    // } 
    // // if only community data in the cache, fetch module data
    // else if (storedData.communities) {
    //   return new Promise((resolve, reject) => {
    //     moduleServices
    //     .fetchModules()
    //     .then((response) => {
    //       const modules = response
    //       const returnData:any = {modules: modules, communities: storedData.communities}
    //       resolve(returnData);
    //     })
    //     .catch((error) => {
    //       console.error(error)
    //       resolve({modules: [], communities: []});
    //     });
    //   })
    // } 
    // // if only module data in the cache, fetch community data
    // else if (storedData.modules) {
    //   return new Promise((resolve, reject) => {
    //     moduleServices
    //     .fetchCommunities()
    //     .then((response) => {
    //       const communities = response
    //       const returnData:any = {modules: storedData.modules, communities: communities}
    //       resolve(returnData);
    //     })
    //     .catch((error) => {
    //       console.error(error)
    //       resolve({modules: [], communities: []});
    //     });
    //   });
    // } 
    // // if cache is empty, fetch both
    // else {
// return new Promise((resolve, reject) => {
//   moduleServices
//     .fetchModules()
//     .then((response) => {
//       const modules = response
//       userServices
//       .fetchUserModules("test")
//       .then((response) => {
//         const checked = response.checked ? response.checked : {}
//         resolve(modules);
//       })
//     });
// });

// onMessage("get-current-tab", async () => {
//   try {
//     const tab = await browser.tabs.get(previousTabId);
//     return {
//       title: tab?.id,
//     };
//   } catch {
//     return {
//       title: undefined,
//     };
//   }
// });

    // return new Promise((resolve, reject) => {
    //   browser.tabs.query(queryOptions)
    //   .then((tabs) => {
    //         console.log('Knowledge2', knowledge, knowledge.response)
    //         Promise.all([browser.tabs.sendMessage(tabs[0].id!, {
    //           type: "send_knowledge", 
    //           data: {
    //             knowledge: knowledge
    //           }
    //         })])
    //         .then(response => {
    //           resolve(null)
    //         })
    //   })
    // })

    // moduleServices
    //   .updateKnowledge(request.data.checked, request.data.modules)
    //   .then((response) => {
    //     console.log(response)
    //     browser.tabs.query(queryOptions)
    //     .then((tabs) => {
    //           browser.tabs.sendMessage(tabs[0].id, request)
    //           .then(response => {
    //             console.log(response)
    //           })
    //     })
    //   }); 