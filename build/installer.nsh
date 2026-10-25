; Incluído no instalador do Windows pelo electron-builder (nsis.include no electron-builder.yml).

; Atualização feita pelo próprio app: o electron-updater abre o instalador com --updated. Nesse
; caso ele roda sem telas, na mesma pasta e para o mesmo usuário da instalação atual, e reabre o
; Relaunch no fim (--force-run). Vale também para apps antigos (0.1.0 e 0.1.1), que abriam o
; instalador sem /S e mostravam a tela "Para quem esta aplicação deve ser instalada?".
!macro preInit
  ${if} ${isUpdated}
    SetSilent silent
  ${endIf}
!macroend
