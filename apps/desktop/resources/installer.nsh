; SkillVault 安装器自定义脚本（electron-builder 通过 buildResources/installer.nsh 自动加载）
;
; 背景：自动更新安装时，安装器会从注册表 InstallLocation 读取上一次的安装目录。
; 若该值被截断成 "D:SkillVault"（盘符后缺少反斜杠），NSIS 会把它当成「驱动器相对路径」，
; 相对安装器当前工作目录解析，最终把新版本装进 "D:\SkillVault\SkillVault" 这类嵌套目录，
; 旧版本没有被覆盖：系统显示已是最新版，实际运行的仍是旧版，于是反复下载安装包。
;
; 这里在安装目录确定之后、写入文件之前把路径补全，确保后续解包、注册表、快捷方式都指向同一目录。

!macro customInit
  ${If} $INSTDIR != ""
    ; 第 2 个字符是 ":" 才可能是 "X:..." 形式的盘符路径
    StrCpy $R0 $INSTDIR 1 1
    ${If} $R0 == ":"
      ; 第 3 个字符不是 "\" 时补上反斜杠（"D:SkillVault" -> "D:\SkillVault"）
      StrCpy $R0 $INSTDIR 1 2
      ${If} $R0 != "\"
        StrCpy $R1 $INSTDIR 2
        StrCpy $R2 $INSTDIR "" 2
        StrCpy $INSTDIR "$R1\$R2"
      ${EndIf}
    ${EndIf}
  ${EndIf}
!macroend
