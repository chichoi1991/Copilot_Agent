function main(
  workbook: ExcelScript.Workbook,
  queryType: string,
  hostName: string,
  ip: string,
  serialNo: string,
  env: string,
  location: string,
  vendor: string,
  osType: string,
  ownerName: string,
  usingDep: string,
  ownerCorp: string,
  keyword: string
): string {

  // ★ 테이블 이름을 실제 Excel 테이블 이름으로 변경하세요
  const table = workbook.getTable("AssetTable");
  if (!table) {
    return JSON.stringify({
      totalCount: 0,
      data: [],
      truncated: false,
      error: "테이블 'AssetTable'을 찾을 수 없습니다. 테이블 이름을 확인하세요."
    });
  }

  const headerValues = table.getHeaderRowRange().getValues()[0];
  const headers: string[] = headerValues.map(h => String(h));
  const rows = table.getRangeBetweenHeaderAndTotal().getValues();

  // 헤더명 → 열 인덱스 맵
  const col: Record<string, number> = {};
  headers.forEach((h, i) => { col[h] = i; });

  // 파라미터 정리 (null/undefined → 빈 문자열)
  queryType = safe(queryType);
  hostName = safe(hostName);
  ip = safe(ip);
  serialNo = safe(serialNo);
  env = safe(env);
  location = safe(location);
  vendor = safe(vendor);
  osType = safe(osType);
  ownerName = safe(ownerName);
  usingDep = safe(usingDep);
  ownerCorp = safe(ownerCorp);
  keyword = safe(keyword);

  // queryType 기본값: exact_lookup 조건이 있으면 exact_lookup, 없으면 filtered_list
  if (queryType === "") {
    if (hostName !== "" || ip !== "" || serialNo !== "") {
      queryType = "exact_lookup";
    } else {
      queryType = "filtered_list";
    }
  }

  // ══════════════════════════════════════
  // 필터링
  // ══════════════════════════════════════
  let filtered: (string | number | boolean)[][] = [];

  switch (queryType) {
    case "exact_lookup":
    case "detailed_summary":
      filtered = rows.filter(r => {
        if (hostName !== "" && eqCell(r, col, "HostName", hostName)) return true;
        if (ip !== "" && eqCell(r, col, "IP", ip)) return true;
        if (ip !== "" && eqCell(r, col, "Public_Service_IP", ip)) return true;
        if (serialNo !== "" && eqCell(r, col, "SerialNo", serialNo)) return true;
        return false;
      });
      break;

    case "lifecycle_check":
      filtered = rows.filter(r =>
        matchIf(r, col, "Env", env) &&
        matchIf(r, col, "Location", location) &&
        matchIf(r, col, "Vendor", vendor) &&
        matchIf(r, col, "OwnerName", ownerName) &&
        matchIf(r, col, "UsingDep", usingDep) &&
        matchIf(r, col, "OwnerCorp", ownerCorp)
      );
      break;

    case "security_monitoring_lookup":
      filtered = rows.filter(r =>
        matchIf(r, col, "Env", env) &&
        matchIf(r, col, "Location", location) &&
        matchIf(r, col, "OwnerName", ownerName) &&
        matchIf(r, col, "UsingDep", usingDep) &&
        matchIf(r, col, "OwnerCorp", ownerCorp)
      );
      break;

    case "tech_stack_lookup":
      filtered = rows.filter(r =>
        matchIf(r, col, "Env", env) &&
        matchIf(r, col, "Location", location) &&
        matchIf(r, col, "OSType", osType) &&
        matchIf(r, col, "OwnerName", ownerName) &&
        matchIf(r, col, "UsingDep", usingDep) &&
        matchKeyword(r, col, keyword)
      );
      break;

    case "ownership_lookup":
      filtered = rows.filter(r =>
        matchIf(r, col, "Env", env) &&
        matchIf(r, col, "Location", location) &&
        matchIf(r, col, "OwnerName", ownerName) &&
        matchIf(r, col, "UsingDep", usingDep) &&
        matchIf(r, col, "OwnerCorp", ownerCorp)
      );
      break;

    case "hardware_spec_lookup":
      filtered = rows.filter(r =>
        matchIf(r, col, "Env", env) &&
        matchIf(r, col, "Location", location) &&
        matchIf(r, col, "Vendor", vendor) &&
        matchIf(r, col, "OwnerName", ownerName) &&
        matchIf(r, col, "UsingDep", usingDep)
      );
      break;

    default: // filtered_list 및 기타
      filtered = rows.filter(r =>
        matchIf(r, col, "Env", env) &&
        matchIf(r, col, "Location", location) &&
        matchIf(r, col, "Vendor", vendor) &&
        matchIf(r, col, "OSType", osType) &&
        matchIf(r, col, "OwnerName", ownerName) &&
        matchIf(r, col, "UsingDep", usingDep) &&
        matchIf(r, col, "OwnerCorp", ownerCorp) &&
        matchKeyword(r, col, keyword)
      );
      break;
  }

  // ══════════════════════════════════════
  // 반환 필드 결정 + 결과 가공
  // ══════════════════════════════════════
  const fieldSet = getFieldSet(queryType, headers);
  const totalCount = filtered.length;
  const maxRows = 30;
  const truncated = totalCount > maxRows;

  // 최대 30건, 필요한 필드만 추출
  const data: Record<string, string>[] = [];
  const limit = Math.min(totalCount, maxRows);

  for (let i = 0; i < limit; i++) {
    const row = filtered[i];
    const obj: Record<string, string> = {};
    for (let f = 0; f < fieldSet.length; f++) {
      const fieldName = fieldSet[f];
      const idx = col[fieldName];
      if (idx !== undefined) {
        const val = row[idx];
        if (val === null || val === undefined || val === "") {
          obj[fieldName] = "";
        } else {
          obj[fieldName] = String(val);
        }
      }
    }
    data.push(obj);
  }

  // ══════════════════════════════════════
  // 결과 반환 (JSON 문자열)
  // ══════════════════════════════════════
  const result = {
    totalCount: totalCount,
    truncated: truncated,
    queryType: queryType,
    data: data,
    error: ""
  };

  return JSON.stringify(result);
}


// ══════════════════════════════════════
// 헬퍼 함수
// ══════════════════════════════════════

/** null/undefined를 빈 문자열로 변환 */
function safe(val: string): string {
  if (val === null || val === undefined) return "";
  return String(val).trim();
}

/** 셀 값과 파라미터가 정확히 일치하는지 (대소문자/공백 무시) */
function eqCell(
  row: (string | number | boolean)[],
  col: Record<string, number>,
  field: string,
  param: string
): boolean {
  const idx = col[field];
  if (idx === undefined) return false;
  const cellVal = String(row[idx]).replace(/\s+/g, "").toLowerCase();
  const paramVal = param.replace(/\s+/g, "").toLowerCase();
  return cellVal === paramVal;
}

/** 파라미터가 비어있으면 통과, 있으면 부분 일치 검사 (대소문자 무시) */
function matchIf(
  row: (string | number | boolean)[],
  col: Record<string, number>,
  field: string,
  param: string
): boolean {
  if (param === "") return true;
  const idx = col[field];
  if (idx === undefined) return true;
  return String(row[idx]).trim().toLowerCase().includes(param.trim().toLowerCase());
}

/** 키워드를 주요 텍스트 필드에서 검색 */
function matchKeyword(
  row: (string | number | boolean)[],
  col: Record<string, number>,
  keyword: string
): boolean {
  if (keyword === "") return true;
  const kw = keyword.trim().toLowerCase();
  const searchFields = [
    "Purpose", "Domain", "WEB_WAS", "DBMS",
    "OS_Info", "HostName", "Model"
  ];
  for (let i = 0; i < searchFields.length; i++) {
    const idx = col[searchFields[i]];
    if (idx !== undefined) {
      if (String(row[idx]).toLowerCase().includes(kw)) {
        return true;
      }
    }
  }
  return false;
}

/** queryType별 반환 필드 목록 */
function getFieldSet(queryType: string, allHeaders: string[]): string[] {
  switch (queryType) {
    case "exact_lookup":
    case "detailed_summary":
      // 전체 필드 반환
      return allHeaders;

    case "filtered_list":
      return [
        "HostName", "IP", "Purpose", "Env", "RunStatus",
        "Location", "Vendor", "Model", "OSType",
        "OwnerName", "UsingDep"
      ];

    case "lifecycle_check":
      return [
        "HostName", "IP", "Env", "Vendor", "Model",
        "HW_Warranty", "InstallDate", "EoS",
        "Firmware_BIOS", "Update", "RunStatus"
      ];

    case "tech_stack_lookup":
      return [
        "HostName", "IP", "Env", "OSType", "OS_Info",
        "KernelBit", "WEB_WAS", "DBMS", "Domain"
      ];

    case "ownership_lookup":
      return [
        "HostName", "IP", "Purpose", "Env",
        "OwnerCorp", "UsingCopr", "UsingDep", "OwnerName"
      ];

    case "security_monitoring_lookup":
      return [
        "HostName", "IP", "Env", "RunStatus",
        "Mornitoring_Zabbix", "Mornitoring_SIP",
        "Backup", "SEP", "Wazuh"
      ];

    case "hardware_spec_lookup":
      return [
        "HostName", "IP", "Env", "Vendor", "Model", "Size",
        "CPU", "CPUCount", "CoreCount", "MemoryGB",
        "RAIDCont_Vendor", "RAIDCont_Model",
        "DISK_Model", "Disk_Info", "NIC_Vendor", "NIC_Model"
      ];

    default:
      return [
        "HostName", "IP", "Purpose", "Env",
        "Location", "OwnerName", "UsingDep"
      ];
  }
}