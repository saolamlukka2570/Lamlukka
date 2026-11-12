/**
 * Google Apps Script (GAS) สำหรับอัปโหลดใบเสร็จรับเงินค่าขยะเข้า Google Drive
 * 
 * โฟลเดอร์เป้าหมาย: https://drive.google.com/drive/folders/1Gqxt-1GiC5cxUcbeyV8CoXASKV20lyOs
 * 
 * วิธีการติดตั้ง:
 * 1. ไปที่ https://script.google.com/ แล้วสร้างโครงการใหม่ (New Project)
 * 2. คัดลอกโค้ดทั้งหมดนี้ไปวางทับโค้ดเดิมในไฟล์ Code.gs
 * 3. กด Deploy (ทำให้ใช้งานได้) -> New Deployment (การทำให้ใช้งานได้รายการใหม่)
 * 4. เลือกประเภท (Select type): Web App (เว็บแอป)
 * 5. ตั้งค่า:
 *    - Description: "Upload Waste Receipts"
 *    - Execute as: "Me" (ฉัน)
 *    - Who has access: "Anyone" (ทุกคน)
 * 6. กดยืนยัน (Deploy) และให้สิทธิ์ (Authorize Access) กับบัญชี Google ของคุณ
 * 7. Copy URL (Web App URL) ที่ได้ไปใส่ในไฟล์ waste-payments.html (บรรทัดที่ 639)
 */

function doPost(e) {
  // โฟลเดอร์ ID สำหรับเก็บใบเสร็จ
  const FOLDER_ID = '1Gqxt-1GiC5cxUcbeyV8CoXASKV20lyOs';
  
  try {
    // กำหนด Headers เพื่อรองรับ CORS
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json"
    };

    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({ error: "No data received" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const data = JSON.parse(e.postData.contents);
    const base64Data = data.base64;
    const fileName = data.filename || "receipt_" + new Date().getTime() + ".jpg";

    if (!base64Data) {
      return ContentService.createTextOutput(JSON.stringify({ error: "No base64 data" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // แยก Base64 string ออกจาก Prefix (data:image/jpeg;base64,...)
    const splitBase = base64Data.split(',');
    const base64String = splitBase.length > 1 ? splitBase[1] : splitBase[0];
    const mimeType = splitBase.length > 1 ? splitBase[0].split(':')[1].split(';')[0] : 'image/jpeg';

    // แปลง Base64 เป็น Blob
    const decodedFile = Utilities.base64Decode(base64String);
    const blob = Utilities.newBlob(decodedFile, mimeType, fileName);

    // บันทึกลง Google Drive
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const file = folder.createFile(blob);
    
    // ตั้งค่าให้ทุกคนที่มีลิงก์สามารถดูได้ (Public View)
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const fileId = file.getId();
    // สร้าง Direct URL สำหรับดึงรูปภาพมาแสดงผล
    const imageUrl = "https://drive.google.com/uc?export=view&id=" + fileId;

    return ContentService.createTextOutput(JSON.stringify({ 
      success: true, 
      imageUrl: imageUrl,
      fileId: fileId
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: error.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doOptions(e) {
  return ContentService.createTextOutput("OK")
    .setMimeType(ContentService.MimeType.TEXT);
}
