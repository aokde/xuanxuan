import Server from './server';
import MemberProfileDialog from '../views/common/member-profile-dialog';
import Messager from '../components/messager';
import ContextMenu from '../components/context-menu';
import DateHelper from '../utils/date-helper';
import Lang from '../lang';
import Platform from 'Platform';
import Events from './events';
import profile from './profile';

const EVENT = {
    app_link: 'app.link',
    net_online: 'app.net.online',
    net_offline: 'app.net.offline',
};

const onAppLinkClick = (type, listener) => {
    return Events.on(`${EVENT.app_link}.${type}`, listener);
};

const emitAppLinkClick = (type, target) => {
    return Events.emit(`${EVENT.app_link}.${type}`, target);
};

onAppLinkClick('Member', target => {
    MemberProfileDialog.show(target);
});

Server.onUserLogin(user => {
    if(user.signed && (user.isNeverLogined || !DateHelper.isToday(user.lastLoginTime))) {
        Messager.show(Lang.string('login.signed'), {
            type: 'success',
            icon: 'calendar-check',
            autoHide: true,
        })
    }
});

Server.onUserLoginout((user, code, reason, unexpected) => {
    if(user && reason === 'KICKOFF') {
        Messager.show(Lang.error('KICKOFF'), {
            type: 'danger',
            icon: 'alert',
        });
    }
});

document.body.classList.add(`os-${Platform.env.os}`);

document.addEventListener('click', e => {
    let target = e.target;
    while(target && !((target.classList && target.classList.contains('app-link')) || (target.tagName === 'A' && target.attributes['href']))) {
        target = target.parentNode;
    }

    if(target && (target.tagName === 'A' || target.classList.contains('app-link')) && (target.attributes['href'] || target.attributes['data-url'])) {
        const link = (target.attributes['data-url'] || target.attributes['href']).value;
        if(link.startsWith('http://') || link.startsWith('https://')) {
            Platform.ui.openExternal(link);
            e.preventDefault();
        } else if(link.startsWith('@')) {
            const params = link.substr(1).split('/');
            emitAppLinkClick(params[0], params[1]);
            e.preventDefault();
        }
    }
});


window.addEventListener('online',  () => {
    Events.emit(EVENT.net_online);
});
window.addEventListener('offline',  () => {
    Events.emit(EVENT.net_offline);
});


let dragLeaveTask;
const completeDragNDrop = () => {
    document.body.classList.remove('drag-n-drop-over-in');
    setTimeout(() => {
        document.body.classList.remove('drag-n-drop-over');
    }, 350);
}
window.ondragover = e => {
    clearTimeout(dragLeaveTask);
    if(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
        document.body.classList.add('drag-n-drop-over');
        setTimeout(() => {
            document.body.classList.add('drag-n-drop-over-in');
        }, 10);
    }
    e.preventDefault();
    return false;
};
window.ondragleave = e => {
    clearTimeout(dragLeaveTask);
    dragLeaveTask = setTimeout(completeDragNDrop, 300);
    e.preventDefault();
    return false;
};
window.ondrop = e => {
    clearTimeout(dragLeaveTask);
    completeDragNDrop();
    if(DEBUG) {
        console.collapse('DRAG FILE', 'redBg', (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length ? e.dataTransfer.files[0].path : ''), 'redPale');
        console.log(e);
        console.groupEnd();
    }
    e.preventDefault();
    return false;
};


if(Platform.ui.onRequestQuit) {
    Platform.ui.onRequestQuit(() => {
        const user = profile.user;
        if(user && !user.isUnverified) {
            const appCloseOption = user.config.appCloseOption;
            if(appCloseOption === 'minimize') {
                Platform.ui.hideWindow();
                return false;
            } else if(appCloseOption !== 'close' && Platform.ui.showQuitConfirmDialog) {
                Platform.ui.showQuitConfirmDialog((result, checked) => {
                    if(checked && result) {
                        user.config.appCloseOption = result;
                    }
                    if(result === 'close') {
                        Server.logout();
                    }
                    return result;
                });
                return false;
            }
        }
        Server.logout();
    });
}

let quit = null;
if(Platform.ui.quit) {
    quit = (delay = 1000, ignoreListener = true) => {
        if(ignoreListener) {
            Server.logout();
        }
        Platform.ui.quit(delay, ignoreListener);
    };
}

export default {
    get canQuit() {
        return !!Platform.ui.quit;
    },
    onAppLinkClick,
    emitAppLinkClick,
    quit,
    showMessger: Messager.show,
    showContextMenu: ContextMenu.show
};
