/**
 * Google Apps Script (GAS) สำหรับอัปโหลดภาพเข้า Google Drive
 * 
 * วิธีการติดตั้ง:
 * 1. ไปที่ https://script.google.com/ แล้วสร้างโครงการใหม่
 * 2. คัดลอกโค้ดทั้งหมดนี้ไปวางทับโค้ดเดิม
 * 3. กด Deploy (ทำให้ใช้งานได้) -> New Deployment (การทำให้ใช้งานได้รายการใหม่)
 * 4. เลือกประเภท: Web App (เว็บแอป)
 * 5. สิทธิ์การเข้าถึง (Who has access): "Anyone" (ทุกคน)
 * 6. กดยืนยัน และให้สิทธิ์ (Authorize)
 * 7. Copy URL (Web App URL) ที่ได้ไปใส่ในหน้าเว็บ HTML ของคุณ
 */

function doPost(e) {
  // โฟลเดอร์ ID ของ Google Drive ที่คุณต้องการเก็บรูป
  const FOLDER_ID = '1TiJtrryOSNMFwNlfKYFJEeh7_j_wc1Qs';
  
  try {
    // กำหนดให้ตอบกลับเป็น JSON และอนุญาตให้ข้ามโดเมน (CORS)
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

    // แปลงข้อมูล JSON ที่ส่งมาจากหน้าเว็บ
    const data = JSON.parse(e.postData.contents);
    const base64Data = data.base64;
    const fileName = data.filename || "pole_" + new Date().getTime() + ".jpg";

    if (!base64Data) {
      return ContentService.createTextOutput(JSON.stringify({ error: "No base64 image data" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ลบส่วนหัวของ Base64 (เช่น data:image/jpeg;base64,) ออกก่อนนำไปสร้างไฟล์
    const splitBase = base64Data.split(',');
    const base64String = splitBase.length > 1 ? splitBase[1] : splitBase[0];
    const mimeType = splitBase.length > 1 ? splitBase[0].split(':')[1].split(';')[0] : 'image/jpeg';

    // แปลง Base64 เป็น Blob
    const decodedFile = Utilities.base64Decode(base64String);
    const blob = Utilities.newBlob(decodedFile, mimeType, fileName);

    // บันทึกลง Google Drive ตาม FOLDER_ID ที่ระบุ
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const file = folder.createFile(blob);
    
    // สำคัญ: ตั้งค่าไฟล์ให้ทุกคนที่มีลิงก์สามารถดูได้ (เพื่อให้แสดงบนเว็บได้)
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // ดึง ID ของไฟล์มาเพื่อสร้าง Direct Link
    const fileId = file.getId();
    
    // สร้าง Direct View/Download URL (สำหรับใช้ในแท็ก <img>)
    const imageUrl = "https://drive.google.com/uc?export=view&id=" + fileId;

    return ContentService.createTextOutput(JSON.stringify({ 
      success: true, 
      imageUrl: imageUrl,
      fileId: fileId
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      error: error.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// อนุญาต CORS preflight
function doOptions(e) {
  return ContentService.createTextOutput("OK")
    .setMimeType(ContentService.MimeType.TEXT);
}
