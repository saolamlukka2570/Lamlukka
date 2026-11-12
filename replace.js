const fs = require('fs');
const file = 'digital-infrastructure-signs.html';
let content = fs.readFileSync(file, 'utf8');

// Replace table headers
content = content.replace(/<th class="ps-4 text-nowrap">รหัสสายทาง<\/th>\s*<th class="text-nowrap">ชื่อป้ายซอย<\/th>\s*<th class="text-nowrap">ประเภทถนน<\/th>\s*<th class="text-nowrap">ผิวจราจร<\/th>\s*<th class="text-nowrap">กว้าง x ยาว \(เมตร\)<\/th>\s*<th class="text-nowrap">หมู่ที่<\/th>\s*<th class="text-nowrap">สภาพ<\/th>\s*<th class="text-nowrap">ปีสร้าง \(พ.ศ.\)<\/th>\s*<th class="text-nowrap">การประเมินสภาพทาง \(AI\)<\/th>/,
`<th class="text-nowrap ps-4">ชื่อป้ายซอย</th>
                                    <th class="text-nowrap">พิกัด</th>`);

// Replace the form inside modal
// We just need to replace the form body. Let's find `<div class="modal-body p-4 bg-slate-50">` and replace everything inside it up to `<div class="modal-footer">` or similar.
// Wait, regex might be tricky. Let's find the specific form fields and replace them.
// The form fields for new road have ids like nrRoadId, nrRoadName, nrRoadType, etc.

const formRegex = /<div class="row g-3">[\s\S]*?<\/form>/;
const newForm = `<div class="row g-3">
                              <!-- Col 1 -->
                              <div class="col-md-12">
                                  <label class="form-label text-xs fw-bold text-slate-700">ชื่อป้ายซอย <span class="text-danger">*</span></label>
                                  <input type="text" class="form-control text-sm" id="nrRoadName" required placeholder="เช่น ซอยสุขใจ 1">
                              </div>
                              <div class="col-md-6">
                                  <label class="form-label text-xs fw-bold text-slate-700">ละติจูด (Latitude)</label>
                                  <input type="text" class="form-control text-sm" id="nrLat" required placeholder="เช่น 17.123456">
                              </div>
                              <div class="col-md-6">
                                  <label class="form-label text-xs fw-bold text-slate-700">ลองจิจูด (Longitude)</label>
                                  <input type="text" class="form-control text-sm" id="nrLng" required placeholder="เช่น 103.123456">
                              </div>
                              
                              <div class="col-12 mt-4">
                                  <label class="form-label text-xs fw-bold text-slate-700"><i class="fa-solid fa-map-location-dot text-indigo-500 me-1"></i>ปักหมุดพิกัดบนแผนที่</label>
                                  <div id="digitizeMapContainer" class="rounded-3 border overflow-hidden shadow-sm" style="height: 350px; background-color: #e2e8f0;"></div>
                                  <div class="mt-2 text-xs text-slate-500">
                                      <i class="fa-solid fa-circle-info me-1"></i>คลิกที่ไอคอน Marker ด้านซ้ายของแผนที่ แล้วคลิกจุดบนแผนที่เพื่อปักหมุดตำแหน่งป้ายซอย
                                  </div>
                              </div>
                          </div>
                      </div>
                      
                      <div class="modal-footer border-top py-2 bg-slate-50">
                          <button type="button" class="btn btn-sm btn-outline-secondary px-4 fw-semibold" data-bs-dismiss="modal">ยกเลิก</button>
                          <button type="submit" class="btn btn-indigo text-white bg-indigo-600 hover:bg-indigo-700 px-4 fw-semibold"><i class="fa-solid fa-save me-1"></i><span id="btnSubmitFormText">บันทึกขึ้นทะเบียน</span></button>
                      </div>
                  </form>`;

content = content.replace(formRegex, newForm);

fs.writeFileSync(file, content, 'utf8');
console.log("Replaced form and table successfully.");
