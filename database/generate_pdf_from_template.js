const TEMPLATE_ID = '1VUw9jucvnserjbBco8dnpWdg7Zf5886ANil-ix0G6EI';
const DESTINATION_FOLDER_ID = '1QKY6FmJ-wViTDImzYc-Tr1iXJxSrfBz1';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const complaintId = data.complaint_id || 'UNKNOWN';
    
    // จัดรูปแบบวันที่สำหรับชื่อไฟล์ (เช่น 05-05-2569)
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear() + 543;
    const dateStr = dd + '-' + mm + '-' + yyyy;
    const fileName = 'คำร้อง_' + complaintId + '_' + dateStr;
    
    // 1. คัดลอกเทมเพลตไปยังโฟลเดอร์ปลายทาง
    const templateDoc = DriveApp.getFileById(TEMPLATE_ID);
    const folder = DriveApp.getFolderById(DESTINATION_FOLDER_ID);
    const newDocFile = templateDoc.makeCopy(fileName, folder);
    const docId = newDocFile.getId();
    
    // 2. เปิดเอกสารใหม่เพื่อแก้ไขข้อมูล
    const doc = DocumentApp.openById(docId);
    const body = doc.getBody();
    
    // 3. แทนที่ข้อความ (Placeholders)
    body.replaceText('{{COMPLAINT_ID}}', complaintId);
    body.replaceText('{{REPORTER_NAME}}', data.reporter_name || '-');
    body.replaceText('{{REPORTER_PHONE}}', data.reporter_phone || '-');
    body.replaceText('{{REPORTER_ADDRESS}}', data.reporter_address || '-');
    body.replaceText('{{POLE_ID}}', data.pole_id || '-');
    body.replaceText('{{LOCATION}}', data.location || '-');
    body.replaceText('{{DAMAGE_CAUSE}}', data.damage_cause || '-');
    body.replaceText('{{LATITUDE}}', data.latitude || '-');
    body.replaceText('{{LONGITUDE}}', data.longitude || '-');
    body.replaceText('{{DATE}}', data.date || '-');
    
    // บันทึกการเปลี่ยนแปลง
    doc.saveAndClose();
    
    // 4. แปลงเป็น PDF
    const pdfBlob = newDocFile.getAs('application/pdf');
    const pdfFile = folder.createFile(pdfBlob);
    pdfFile.setName(fileName + '.pdf');
    
    // 5. เปิดสิทธิ์ให้ทุกคนที่มีลิงก์สามารถดูได้
    pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // 6. ลบไฟล์ Google Doc ชั่วคราวทิ้ง (เหลือไว้แค่ PDF)
    newDocFile.setTrashed(true);
    
    // ส่ง URL ของไฟล์ PDF กลับไปยังหน้าเว็บ
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      url: pdfFile.getUrl()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
