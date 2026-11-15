; SkillVault 安装器自定义脚本（electron-builder 通过 buildResources/installer.nsh 自动加载）
;
; 背景：自动更新安装时，安装器会从注册表 InstallLocation 读取上一次的安装目录。
; 若该值被截断成 "D:SkillVault"（盘符后缺少反斜杠），NSIS 会把它当成「驱动器相对路径」，
; 相对安装器当前工作目录解析，最终把新版本装进 "D:\SkillVault\SkillVault" 这类嵌套目录，
; 旧版本没有被覆盖：系统显示已是最新版，实际运行的仍是旧版，于是反复下载安装包。
;
; 处理分两层：
; 1) 归一化注册表里的 InstallLocation（HKCU / HKLM）。后续「安装模式页」「静默升级提权分支」
;    会再次 ReadRegStr 覆写 $INSTDIR，只修 $INSTDIR 挡不住这些旁路；把注册表值改对了才彻底。
; 2) 归一化 $INSTDIR 本身（覆盖 /D 参数、以及注册表值在本次运行中再次被读入的情况）。
;
; 只改写「X:...」这类盘符后缺反斜杠的路径，并去掉误加的包裹引号；
; 正常绝对路径、UNC 路径、普通相对路径保持原样。

!macro skvNormalizeInstallPath var
  ${If} ${var} != ""
    ; 第 2 个字符是 ":" 才可能是 "X:..." 形式的盘符路径
    StrCpy $R3 ${var} 1 1
    ${If} $R3 == ":"
      ; 第 3 个字符不是 "\" 时补上反斜杠（"D:SkillVault" -> "D:\SkillVault"）
      StrCpy $R3 ${var} 1 2
      ${If} $R3 != "\"
        StrCpy $R4 ${var} 2
        StrCpy $R5 ${var} "" 2
        StrCpy ${var} "$R4\$R5"
      ${EndIf}
    ${EndIf}
  ${EndIf}
!macroend

!macro skvNormalizeRegistryInstallLocation rootKey
  ClearErrors
  ReadRegStr $R0 ${rootKey} "${INSTALL_REGISTRY_KEY}" InstallLocation
  ${If} $R0 != ""
    !insertmacro skvNormalizeInstallPath $R0
    ${If} $R0 != ""
      WriteRegStr ${rootKey} "${INSTALL_REGISTRY_KEY}" InstallLocation "$R0"
    ${EndIf}
  ${EndIf}
!macroend

; customInit 在 initMultiUser 之后执行，此时注册表视图已按 64 位校正，可安全读 HKLM
!macro customInit
  !insertmacro skvNormalizeRegistryInstallLocation HKCU
  !insertmacro skvNormalizeRegistryInstallLocation HKLM
  !insertmacro skvNormalizeInstallPath $INSTDIR
!macroend
