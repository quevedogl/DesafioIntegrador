from fastapi import APIRouter, HTTPException
from app.services.churn_service import churn_service

router = APIRouter(prefix="/ml", tags=["ml"])


@router.post("/treinar", summary="Treina o modelo Random Forest com dados sintéticos + reais")
def treinar():
    try:
        metrics = churn_service.train()
        return {"status": "ok", "metricas": metrics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/churn/resumo", summary="Resumo geral de risco de churn dos clientes")
def resumo_churn():
    try:
        return churn_service.get_summary()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/churn/clientes", summary="Predição de churn para todos os clientes")
def churn_clientes():
    try:
        return churn_service.predict_all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
