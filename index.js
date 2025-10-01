import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

const sf = path.resolve('./session.json');
const apikey = 'AIzaSyBftbRylwXPJYC_9No_PjfjNHeyZGSeOqA';

const webToApp = {
  api: {
    base: {
      firebase: 'https://www.googleapis.com',
      refresh: 'https://securetoken.googleapis.com',
      maker: 'https://cg-web-to-app-maker.websitetoapp.net'
    },
    endpoints: {
      signUp: (key) => `/identitytoolkit/v3/relyingparty/signupNewUser?key=${key}`,
      token: (key) => `/v1/token?key=${key}`,
      create: () => `/maker/create_web_app`,
      taskUpdates: (taskId) => `/maker/get_task_updates?task_id=${taskId}`
    }
  },

  headers: {
    'user-agent': 'NB Android/1.0.0',
    'connection': 'Keep-Alive',
    'content-type': 'application/json',
    'accept': 'application/json'
  },

  utils: {
    randomEmail: () => `${Math.random().toString(36).substring(2, 10)}@gmail.com`,
    randomPassword: () => `NB${Math.random().toString(36).slice(-8)}`,
    expiresAt: (s) => new Date(Date.now() + s * 1000).toISOString(),
    isHexColor: (v) => /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(v),
    isValidUrl: (u) => /^https?:\/\/.+/i.test(u),
    isPhone: (p) => /^\+?[0-9\-\s]+$/.test(p),
    isPngBuffer: (buf) => buf && buf.length >= 8 &&
      [0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A].every((b,i)=>buf[i]===b),
    img: async (url) => {
      const res = await axios.get(url,{responseType:'arraybuffer', timeout:30000});
      return { 
        buffer: Buffer.from(res.data), 
        contentType: (res.headers['content-type']||'').toLowerCase() 
      };
    },
    
    link2Base64: async (url) => {
      const { buffer, contentType } = await webToApp.utils.img(url);
      if (contentType !== 'image/png' || !webToApp.utils.isPngBuffer(buffer)) {
        return { 
            success:false, 
            code:400, 
            result:{ 
                error:"Imagenya cuman bisa *PNG* doang bree.. ðŸ˜—"
             }
         };
      }
      return { 
        success: true, 
        code: 200, 
        result:{ 
            base64:`data:image/png;base64,${buffer.toString('base64')}`
         }
      };
    },
    
    encodeFile: (zip) => encodeURIComponent((zip||'').replace(/\.zip$/i,'')),

    getIcon: (name, style = "baseline") => {
      if (!name || typeof name !== "string") {
        return { 
            success: false, 
            code:400, 
            result:{ 
                error: "Nama iconnya kagak boleh kosong bree ðŸ˜‰"
              }
          };
      }
      const isStyle = ["baseline","outline","round","twotone","sharp"];
      const chosen = isStyle.includes(style) ? style : "baseline";
      return {
        success: true,
        code: 200,
        result: {
          url: `https://material-icons-v1.atrii.dev/icon/${encodeURIComponent(name)}?style=${encodeURIComponent(chosen)}`
        }
      };
    }
  },

  session: {
    load: async () => { try { return JSON.parse(await fs.readFile(sf,'utf-8')); } catch { return null; } },
    save: async (data) => { await fs.writeFile(sf, JSON.stringify(data,null,2)); }
  },

  request: {
    signUp: async (email,password) => {
      const url = `${webToApp.api.base.firebase}${webToApp.api.endpoints.signUp(apikey)}`;
      return axios.post(url, { 
        email,
        password,
        clientType: 'CLIENT_TYPE_ANDROID'
      },{
        headers: webToApp.headers
       }
     );
    },
    
    refreshToken: async (refreshToken) => {
      const url = `${webToApp.api.base.refresh}${webToApp.api.endpoints.token(apikey)}`;
      const payload = new URLSearchParams({grant_type:'refresh_token',refresh_token:refreshToken});
      return axios.post(url,
        payload, 
     {
        headers:
            { 
            ...webToApp.headers,
            'Content-Type':'application/x-www-form-urlencoded'
         }
       }
     );
    },
    
    webview: async (payload) => {
      const url = `${webToApp.api.base.maker}${webToApp.api.endpoints.create()}`;
      return axios.post(
        url,
        payload,
      { 
        headers:webToApp.headers
       }
     );
    },
    
    polling: async (taskId) => {
      const url = `${webToApp.api.base.maker}${webToApp.api.endpoints.taskUpdates(taskId)}`;
      return axios.get(url,
      {
        headers:webToApp.headers
       }
     );
    }
  },

  payload: async (opts,userId) => {
    const errors = [];
    if (!opts.app_name?.trim()) errors.push("App namenya kudu diisi yak bree.. kalo kosong nanti apa nama appnya ðŸ˜‚ Ngawurrr....");
    if (!opts.package_name?.trim()) errors.push(" Package namenya wajib diisi yak bree.. yakali Aplikasi kagak ada package name nya ðŸ˜‚");
    if (!Number.isFinite(Number(opts.version)) || Number(opts.version)<1) errors.push("Version Appnya kudu diisi bree, contohnya kek begini (>=1)");
    if (!webToApp.utils.isValidUrl(opts.website_url)) errors.push("Websitenya wajib diisi yak bree... Yakali webview kagak ada link webnya ðŸ—¿");
    if (!webToApp.utils.isHexColor(opts.theme_color)) errors.push("Theme Colornya kudu diisi yak bree (hex, contohnya #3F51B5)");

    let icon_base64;
    if (opts.icon_url) {
      const result = await webToApp.utils.link2Base64(opts.icon_url);
      if (!result.success) errors.push(result.result.error);
      else icon_base64 = result.result.base64;
    } else errors.push("âŒ Iconnya cuman support PNG yak bree bawaan Appnya begitu..");

    if (errors.length>0) 
        return { 
            success: false, 
            code: 400, 
            result:{ 
                error: "Validasinya gagal bree..."
            }
         };

    return {
      success: true,
      code: 200,
      result:{
        app_name: opts.app_name,
        package_name: opts.package_name,
        version: Number(opts.version),
        website_url: opts.website_url,
        theme_color: opts.theme_color,
        features: Array.isArray(opts.features) ? opts.features : [],
        icon_base64,
        user_id: userId,
        user_agent: opts.user_agent || 'NB Android/1.0.0',
        progress_bar: opts.progress_bar || { style: "None", color: null },
        navigation_bar: opts.navigation_bar || {}
      }
    };
  },

  task: async (taskId, intervalMs=5000, timeoutMs=10*60*1000) => {
    const start = Date.now();
    let completedCount = 0;
    let lastSnapshot = null;
    while (Date.now()-start < timeoutMs) {
      const { data:updates } = await webToApp.request.polling(taskId);
      lastSnapshot = updates;
      const pr = Number(updates?.data?.progress ?? 0);
      const progress = Math.max(0, Math.min(100, pr));
      const isCompleted = Boolean(updates?.data?.is_completed);
      const isFailed = Boolean(updates?.data?.is_failed);

      const barLength = 20;
      const filled = Math.max(0, Math.min(barLength, Math.round((progress/100) * barLength)));
      const bar = 'â–ˆ'.repeat(filled) + '-'.repeat(barLength - filled);
      process.stdout.write(`\râ³ [${bar}] ${progress.toFixed(1)}% | Complete: ${completedCount} | Failed: ${isFailed? 'Yeah':'Nah'}`);

      if (isFailed) break;
      if (isCompleted) {
        completedCount++;
        if (completedCount>=2) {
          console.log(`\nâœ… Done bree..`);
          break;
        }
      }
      await new Promise(r=>setTimeout(r,intervalMs));
    }
    return { completedCount,lastSnapshot };
  },

  register: async () => {
    try {
      const sess = await webToApp.session.load();
      if (sess && new Date() < new Date(sess.expiresAt)) {
        return { 
            success: true, 
            code: 200, 
            result: sess 
         };
      }

      const email = webToApp.utils.randomEmail();
      const password = webToApp.utils.randomPassword();
      const { data: signup } = await webToApp.request.signUp(email, password);
      const { data: refreshed } = await webToApp.request.refreshToken(signup.refreshToken);

      const sesi = {
        email,
        password,
        localId: refreshed.user_id,
        idToken: refreshed.id_token,
        refreshToken: refreshed.refresh_token,
        expiresAt: webToApp.utils.expiresAt(Number(refreshed.expires_in))
      };
      await webToApp.session.save(sesi);
      return { 
        success: true, 
        code: 200, 
        result: sesi
      };
    } catch (error) {
      return {
        success: false,
        code: error?.response?.status || 500,
        result: { 
            error: error.message || "Gak tau ðŸ—¿"
         }
      };
    }
  },

  generate: async (userSession, appInput) => {
    try {
      const built = await webToApp.payload(appInput, userSession.localId);
      if (!built.success) {
        return { 
            success: false, 
            code:400, 
            result:{ 
                error: built.result.details || built.result.error
            }
          };
      }

      const { data: created } = await webToApp.request.webview(built.result);
      const taskId = created?.data?.task_id;
      if (!taskId) {
        return { 
            success: false, 
            code: 500, 
            result:{ 
                error: "Task IDnya kagak ada bree ðŸ˜"
             }
          };
      }

      const { completedCount, lastSnapshot } = await webToApp.task(taskId);
      const updates = lastSnapshot?.data;

      if (completedCount >= 2 && updates && !updates.is_failed && updates.zip_file_name) {
        const name = webToApp.utils.encodeFile(updates.zip_file_name);
        const bm = webToApp.api.base.maker;
        const url = "https://cg-web-to-app-maker.websitetoapp.net";

        return {
          success: true,
          code: 200,
          result:{
            task_id: updates.task_id || taskId,
            progress: updates.progress ?? 100,
            zip_file_name: updates.zip_file_name,
            links: {
              dashboard: `${url}/creator/${updates.task_id || taskId}/${name}`,
              apk: `${bm}/maker/download-apk/${updates.task_id || taskId}/${name}`,
              full_package: `${bm}/maker/download_full_package/${updates.task_id || taskId}/${name}`
            }
          }
        };
      }

      return {
        success: true,
        code: 200,
        result:{
          task_id: taskId,
          status: "Building...",
          progress: updates?.progress ?? 0
        }
      };
    } catch (error) {
      return {
        success: false,
        code: error?.response?.status || 500,
        result: { error: error.message || "Gak tau ðŸ–•ðŸ»" }
      };
    }
  }
};

export { webToApp };
