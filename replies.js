var fs = require('fs');
var replies_obj = JSON.parse(fs.readFileSync('./recast_conversation_reply.json', 'utf8'));

module.exports = {
    get_recast_reply: get_recast_reply,
    push_to_recast_reply: push_to_recast_reply,
    push_quick_reply_to_recast: push_quick_reply_to_recast, 
    push_quick_reply_option_to_recast: push_quick_reply_option_to_recast, 
    get_conversation_string: get_conversation_string,
    get_conversation_buttons: get_conversation_buttons,
};  

function get_recast_reply(key, lang, params, memoryparams) {
    var recast_conversation_reply;
    if (typeof memoryparams === 'undefined' || memoryparams == null) {
        recast_conversation_reply = {
            "replies": []
        };
    }
    else {
        recast_conversation_reply = {
            "replies": [],
            "conversation": {
                "memory": memoryparams
            }
        };
    }

    var buttons = get_conversation_buttons(key, lang);
    var reply_obj = get_conversation_string(key, lang);

    if (typeof reply_obj === 'string') {
        push_to_recast_reply(recast_conversation_reply, reply_obj);
        if (typeof params !== 'undefined' && params != null) {
            for (let index = 0; index < params.length; index++) {
                recast_conversation_reply.replies[0].content = 
                    recast_conversation_reply.replies[0].content.replace("_VAR" + index + "_", params[index]);
            }
        }
    }
    else {
        for (let index = 0; index < reply_obj.length; index++) {
            push_to_recast_reply(recast_conversation_reply, reply_obj[index]);
            if (typeof params !== 'undefined' && params != null) {
                for (let index2 = 0; index2 < params.length; index2++) {
                    recast_conversation_reply.replies[index].content = 
                        recast_conversation_reply.replies[index].content.replace("_VAR" + index2 + "_", params[index2]);
                }
            }
        }
    }

    if (buttons) {
        var title = recast_conversation_reply.replies[recast_conversation_reply.replies.length - 1].content;
        recast_conversation_reply.replies.splice(recast_conversation_reply.replies.length - 1, 1);

        push_quick_reply_to_recast(recast_conversation_reply, title);

        for (let index = 0; index < buttons.length; index++) {
            const button = buttons[index];
            push_quick_reply_option_to_recast(recast_conversation_reply, button);
        }
    }

    console.log("get_recast_reply: " + JSON.stringify(recast_conversation_reply));

    return recast_conversation_reply;
}

function get_conversation_buttons(text, lang)
{
    var reply_obj = replies_obj.replies.find(function(element) {
        var result = false;
        if (element.key && element.key == text) {
            result = true;
        }
        return result;
    })
    switch (lang) {
        case "he":
            return reply_obj.buttons_he;
            break;
        case "en":
            return reply_obj.buttons_en;
            break;
        default:
            break;
    }
}

function get_conversation_string(text, lang)
{
    var reply_obj = replies_obj.replies.find(function(element) {
        var result = false;
        if (element.key && element.key == text) {
            result = true;
        }
        return result;
    })
    switch (lang) {
        case "he":
            return reply_obj.he;
            break;
        case "en":
            return reply_obj.en;
            break;
        default:
            break;
    }
}

function push_to_recast_reply(recast_reply, text, buttons)
{
    if (text != null) {
        if (Array.isArray(text)) {
            for (let index = 0; index < text.length; index++) {
                const currtext = text[index];
                recast_reply.replies.push({
                    "type": "text",
                    "content": currtext                                       
                });
            }            
        }
        else {
            recast_reply.replies.push({
                "type": "text",
                "content": text                                       
            });
        }
    }

    if (buttons) {
        var title = recast_reply.replies[recast_reply.replies.length - 1].content;
        recast_reply.replies.splice(recast_reply.replies.length - 1, 1);

        push_quick_reply_to_recast(recast_reply, title);

        for (let index = 0; index < buttons.length; index++) {
            const button = buttons[index];
            push_quick_reply_option_to_recast(recast_reply, button);
        }
    }
    console.log("push_to_recast_reply: " + text);

    return recast_reply;
}

function push_quick_reply_to_recast(recast_reply, text)
{
    if (text != null) {
        recast_reply.replies.push({
            type: 'quickReplies',
            content: {
                title: text,
                buttons: [],
             },
           });
    }
    console.log("push_quick_reply_to_recast: " + text);

    return recast_reply;
}

function push_quick_reply_option_to_recast(recast_reply, text, value)
{
    if (typeof value === 'undefined') {
        value = text;
    }
    if (text != null) {
        recast_reply.replies[recast_reply.replies.length - 1].content.buttons.push(
            { 
                title: text, 
                value: value 
            });
    }
    console.log("push_quick_reply_option_to_recast: text: " + text + " value: " + value);

    return recast_reply;
}