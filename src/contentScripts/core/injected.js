// console.log('FeedWizard enabled - Sampler Only')
let event_handlers = {};

(function (xhr) {

  /** Intercept XHR Requests **/
  const XHR = XMLHttpRequest.prototype;
  const open = XHR.open;
  const send = XHR.send;
  const setRequestHeader = XHR.setRequestHeader;

  XMLHttpRequest.prototype.open = function (method, url) {
    this._method = method;
    this._url = url;
    this._requestHeaders = {}; 
    return open.apply(this, arguments);
  };

  XHR.send = function (postData) {
    const actionName = new URL(this._url).pathname.split("/").at(-1);
    if (actionName === 'TweetDetail') {
        let callback = this.onreadystatechange;
        this.onreadystatechange = function () {
            if (this.readyState === XMLHttpRequest.DONE) {
                let response = this.responseText;
                console.log('Response', response)

                event_handlers[this._id] = {
                    callback: callback,
                    source: this,
                    arguments: arguments,
                };

                const event = new CustomEvent("get_tweet", {
                    detail: {
                        url: this._url,
                        response: this.response
                    }
                });

                window.dispatchEvent(event);
                callback.apply(this, arguments)
            }
            return send.apply(this, arguments);
        };
    }
    return send.apply(this, arguments);
  }

  XMLHttpRequest.prototype.setRequestHeader = function (header, value) {
      this._requestHeaders[header] = value; // Capture headers
      return setRequestHeader.apply(this, arguments);
  };
})(XMLHttpRequest);