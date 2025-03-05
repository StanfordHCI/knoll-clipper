import constants from "~/services/constants";


const extractTweetIdText = (tweetObj) => {
    const tweetThread = []
    let isError = false 
    try {
        const parsedTweet = tweetObj?.data?.threaded_conversation_with_injections_v2?.instructions
        if (parsedTweet && parsedTweet.length > 0) {
            const entries = parsedTweet[0]?.entries 
            if (entries && entries.length > 0) {
                const firstTweet = entries[0]
                const otherTweets = entries.slice(1,)

                // parse first tweet 
                const result = firstTweet?.content?.itemContent?.tweet_results?.result
                if (result && result?.legacy) {
                    const legacy = result.legacy
                    const tweetAuthor = legacy?.user_id_str
                    if ('note_tweet' in result) {
                        tweetThread.push(result['note_tweet']['note_tweet_results']['result'])
                    } else {
                        tweetThread.push(legacy['full_text'])
                    }
                    

                    // parse other tweets
                    otherTweets.forEach(tweets => {
                        const items= tweets?.content?.items
                        if (items) {
                            items.forEach(item => {
                                const itemResult = item?.item?.itemContent?.tweet_results?.result 

                                if (itemResult && itemResult?.legacy) {
                                    let itemLegacy = itemResult.legacy
                                    const author = itemLegacy?.user_id_str
                                    const replyTo = itemLegacy?.in_reply_to_user_id_str
                                    if (tweetAuthor === author && replyTo === author) {
                                        console.log('item result', itemResult)
                                        if ('note_tweet' in itemResult) {
                                            tweetThread.push(itemResult['note_tweet']['note_tweet_results']['result'])
                                        } else {
                                            const tweetContent = itemLegacy?.full_text ? itemLegacy?.full_text : ""
                                            tweetThread.push(tweetContent)
                                        }                    
                                    }

                                }
                            })
                        }
                    })
                }
            }
        }
    } catch(error) {
        console.log('Error', error)
        isError = true
    }
    return {isError: isError, tweetThread: tweetThread}
};

function parseTweet(tweet) {
    console.log(tweet)
    const parsedTweet = JSON.parse(tweet)
    const tweetThread = extractTweetIdText(parsedTweet)
    return tweetThread
}

export {
    parseTweet
}