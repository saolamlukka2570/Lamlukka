/**
 * Google Apps Script (GAS) สำหรับอัปโหลดสลิปโอนเงินค่าขยะเข้า Google Drive
 * 
 * โฟลเดอร์เป้าหมาย: https://drive.google.com/drive/folders/1_uKyEUql3vwvNl8-VQPZKQRyMltsyB8T
 * 
 * วิธีการติดตั้ง:
 * 1. ไปที่ https://script.google.com/ แล้วสร้างโครงการใหม่
 * 2. คัดลอกโค้ดทั้งหมดนี้ไปวางทับโค้ดเดิม
 * 3. กด Deploy (ทำให้ใช้งานได้) -> New Deployment (การทำให้ใช้งานได้รายการใหม่)
 * 4. เลือกประเภท: Web App (เว็บแอป)
 * 5. สิทธิ์การเข้าถึง (Who has access): "Anyone" (ทุกคน)
 * 6. กดยืนยัน และให้สิทธิ์ (Authorize)
 * 7. Copy URL (Web App URL) ที่ได้ไปใส่ในตัวแปร GAS_SLIP_URL ในไฟล์ assets/js/citizen-waste.js (บรรทัดที่ 431)
 */

function doPost(e) {
  // โฟลเดอร์ ID ตามที่ลูกค้าระบุ
  const FOLDER_ID = '1_uKyEUql3vwvNl8-VQPZKQRyMltsyB8T';
  
  try {
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json"
    };

    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({ error: "No data received" })).setMimeType(ContentService.MimeType.JSON);
    }

    const data = JSON.parse(e.postData.contents);
    const base64Data = data.base64;
    const fileName = data.filename || "slip_" + new Date().getTime() + ".jpg";

    if (!base64Data) {
      return ContentService.createTextOutput(JSON.stringify({ error: "No base64 image data" })).setMimeType(ContentService.MimeType.JSON);
    }

    const splitBase = base64Data.split(',');
    const base64String = splitBase.length > 1 ? splitBase[1] : splitBase[0];
    const mimeType = splitBase.length > 1 ? splitBase[0].split(':')[1].split(';')[0] : 'image/jpeg';

    const decodedFile = Utilities.base64Decode(base64String);
    const blob = Utilities.newBlob(decodedFile, mimeType, fileName);

    const folder = DriveApp.getFolderById(FOLDER_ID);
    const file = folder.createFile(blob);
    
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const fileId = file.getId();
    const imageUrl = "https://drive.google.com/uc?export=view&id=" + fileId;

    return ContentService.createTextOutput(JSON.stringify({ 
      success: true, 
      imageUrl: imageUrl,
      fileId: fileId
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doOptions(e) {
  return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
}
