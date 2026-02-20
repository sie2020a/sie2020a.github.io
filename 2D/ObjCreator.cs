using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class ObjCreator : MonoBehaviour
{
    public GameObject[] items;
    public float interval = 3.0f;
    private float time;
    public float xPos = 3.0f;
    public float yPos = 0.05f;

    void Update()
    {
        time += Time.deltaTime;

        if (time >= interval)
        {
            GameObject fallingObj = Instantiate(items[Random.Range(0, items.Length)]) as GameObject;
            fallingObj.transform.position = new Vector2(Random.Range(-xPos, xPos), yPos);
            time = 0;
        }
    }
}
