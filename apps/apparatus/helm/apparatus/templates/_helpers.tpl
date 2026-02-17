{{- define "ts-apparatus.name" -}}
ts-apparatus
{{- end -}}

{{- define "ts-apparatus.labels" -}}
app.kubernetes.io/name: {{ include "ts-apparatus.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ include "ts-apparatus.name" . }}-{{ .Chart.Version }}
{{- end -}}
