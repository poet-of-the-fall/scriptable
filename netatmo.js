const BASE_URL = 'https://api.netatmo.net';

const username = 'your@ma.il';
const password = 'accountPassword';
const client_id = 's0m3R4nd0mID';
const client_secret = 'R4nd0m3S3cr3t';
const scope = 'read_station';
let access_token = null
let request_toke = null
let expires_on = null

const widget = await createWidget()
if (!config.runsInWidget) {
 await widget.presentSmall()
}
Script.setWidget(widget)
Script.complete()

async function createWidget(items) {
 const data = await getData()
 const list = new ListWidget()
 list.url = "netatmo://"
 if(data) {
   var co2 = []

   // Header  
   const header = list.addText(data.station_name)
   header.font = Font.boldSystemFont(13)

   // Optional Rain
   const rain = getRainModule(data)
   if (rain) {
     const rv = list.addText(rain.sum_rain_24 + "mm Regen heute " + ((rain.Rain > 0) ? "💧" : ""))
     rv.font = Font.mediumSystemFont(9)
   }

   list.addSpacer()

   // Outside module values
   const outside = getOutsideModule(data)
   const on = list.addText(outside.Temperature + "°  " + outside.module_name)
   const ov = list.addText("⇩ " + outside.min_temp + '°   ⇧ ' + outside.max_temp + '°   💦' + outside.Humidity + "%")
   on.font = Font.boldSystemFont(11)
   ov.font = Font.mediumSystemFont(9)

   list.addSpacer()

   // Main module values
   const main = getMainModule(data)
   const mn = list.addText(main.Temperature + "°  " + main.module_name)
   const mv = list.addText("💨" + main.CO2 + "ppm   💦" + main.Humidity + "%")
   mn.font = Font.boldSystemFont(11)
   mv.font = Font.mediumSystemFont(9)

   co2.push(main.CO2)

   list.addSpacer()

   // Inside modules values
   const inside = getInsideModules(data)
   for (m of inside) {
     const n = list.addText(m.Temperature + "°  " + m.module_name)
     const v = list.addText("💨" + m.CO2 + "ppm   💦" + m.Humidity + "%")
     n.font = Font.boldSystemFont(11)
     v.font = Font.mediumSystemFont(9)

     co2.push(m.CO2)
   }

   if (calculateColor(co2)) {
     list.backgroundColor = calculateColor(co2)
   }
   list.refreshAfterDate = new Date(Date.now() + 15*60*1000)
 } else {
   list.addSpacer()
   list.addText("Daten nicht verfügbar")
 }
 return list
}

function calculateColor(co2) {
 let max = Math.max(...co2)
 if (max > 2500) {
   return Color.purple()
 } else if (max > 2000) {
   return Color.red()
 } else if (max > 1500) {
   return Color.orange()
 } else if (max > 1000) {
   return Color.yellow()
 } else {
   return null
 }
}

function getOutsideModule(data) {
 for (m of data.modules) {
   if (m.data_type.includes("Temperature") && m.data_type.includes("Humidity") && !m.data_type.includes("CO2")) { 
     return { ...m.dashboard_data, module_name: m.module_name }
   }
 }
 return null
}

function getMainModule(data) {
 return { ...data.dashboard_data, module_name: data.module_name }
}

function getInsideModules(data) {
 let result = []
 for (m of data.modules) {
   if (m.data_type.includes("Temperature") && m.data_type.includes("Humidity") && m.data_type.includes("CO2")) { 
     result.push({ ...m.dashboard_data, module_name: m.module_name })
   }
 }
 return result.length > 0 ? result : null
}

function getRainModule(data) {
 for (m of data.modules) {
   if (m.data_type == "Rain") { 
     return { ...m.dashboard_data, module_name: m.module_name }
   }
 }
 return null
}

async function getData() {
 await handleToken()
  try {
   const req = new Request(BASE_URL + '/api/getstationsdata')
   req.method = 'POST'
   req.body = "access_token=" + access_token
   req.headers = {"Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"}
   data = await req.loadJSON();
   return data.body.devices[0]
  } catch(e) {
   return null
  }
}

async function handleToken() {
 if (!access_token) {
   await authenticate()
 }
 if (expires_on < Date.now()) {
   await authenticate()
 } else if (expires_on - Date.now() < 1200000) {
   await refresh_token
 }
}

async function authenticate() {
 try {
   let req = new Request(BASE_URL + '/oauth2/token')
   req.method = 'POST'
   req.body = "grant_type=password&client_id=" + client_id + "&client_secret=" + client_secret + "&username=" + username + "&password=" + password + "&scope=" + scope
   req.headers = {"Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"}
   data = await req.loadJSON();
   access_token = data.access_token
   refresh_token = data.refresh_token
   expires_on = new Date(Date.now() + data.expires_in * 1000)
 } catch(e) {
   console.log(e)
   return null
 }  
}

async function refreshToken() {
 try {
   let req = new Request(BASE_URL + '/oauth2/token')
   req.method = 'POST'
   req.body = "grant_type=refresh_token&client_id=" + client_id + "&client_secret=" + client_secret + "&refresh_token=" + refresh_token
   req.headers = {"Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"}
   data = await req.loadJSON();
   access_token = data.access_token
   refresh_token = data.refresh_token
   expires_on = new Date(Date.now() + data.expires_in * 1000)
 } catch (e) {
   return null 
 }
}
