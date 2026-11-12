/**
 * Script สำหรับอัปโหลดรูปภาพ "ผลการซ่อม/บันทึกการซ่อม" (Staff Dashboard)
 * โฟลเดอร์ปลายทาง: 12M1JbCVjWz1T80JCr1QvSglQt6lNiPKE
 * 
 * วิธีการติดตั้ง:
 * 1. ไปที่ https://script.google.com/ แล้วสร้างโครงการใหม่
 * 2. คัดลอกโค้ดทั้งหมดนี้ไปวางทับโค้ดเดิม
 * 3. กด Deploy (การทำให้ใช้งานได้) -> New Deployment (รายการใหม่)
 * 4. เลือกประเภท: Web App (เว็บแอป)
 * 5. สิทธิ์การเข้าถึง (Who has access): "Anyone" (ทุกคน)
 * 6. กดยืนยัน และให้สิทธิ์ (Authorize)
 * 7. Copy URL ที่ได้ไปใส่ในตัวแปร GOOGLE_APP_SCRIPT_REPAIR_RESULT_URL ในไฟล์ publicworks-electric.html
 */

function doPost(e) {
  // โฟลเดอร์ ID สำหรับเก็บรูปภาพผลการซ่อม (Repair Result)
  const FOLDER_ID = '12M1JbCVjWz1T80JCr1QvSglQt6lNiPKE';
  
  try {
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
    const fileName = data.filename || "repair_result_" + new Date().getTime() + ".jpg";

    if (!base64Data) {
      return ContentService.createTextOutput(JSON.stringify({ error: "No base64 image data" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ถอดรหัส base64 
    const decodedData = Utilities.base64Decode(base64Data.split(",")[1] || base64Data);
    
    // แปลงเป็น Blob
    const blob = Utilities.newBlob(decodedData, data.mimeType || "image/jpeg", fileName);
    
    // ค้นหาหรือระบุโฟลเดอร์ใน Google Drive
    const folder = DriveApp.getFolderById(FOLDER_ID);
    
    // สร้างไฟล์ในโฟลเดอร์
    const file = folder.createFile(blob);
    
    // ตั้งค่าให้ไฟล์แชร์แบบ Public (เพื่อให้คนอื่นเปิดดูรูปได้)
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // ดึง URL ของรูปภาพ
    const fileUrl = file.getUrl();
    const fileId = file.getId();

    return ContentService.createTextOutput(JSON.stringify({ 
      success: true, 
      url: fileUrl,
      id: fileId 
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      error: error.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doOptions(e) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
}
